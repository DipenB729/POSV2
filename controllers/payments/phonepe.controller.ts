import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/controllers/http";
import * as OrderModel from "@/models/sales/order.model";
import * as PhonePePaymentModel from "@/models/payments/phonepe-payment.model";
import {
  cancelPhonePeSchema,
  initiatePhonePeSchema,
  phonePeCallbackSchema,
  phonePeStatusSchema,
} from "@/schemas/phonepe.schema";
import {
  decodePhonePeCallbackResponse,
  initiatePhonePePayment,
  verifyPhonePeCallbackChecksum,
  verifyPhonePePayment,
} from "@/src/lib/phonepe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"]);

export async function initiate(request: NextRequest) {
  try {
    await requireAllowedRole();
    const payload = initiatePhonePeSchema.parse(await request.json());
    const order = await OrderModel.findById(payload.orderId);

    if (order.error) {
      throw order.error;
    }

    if (order.data.status !== "PENDING") {
      return fail(new Error("PhonePe can only be initiated for pending orders"), 409);
    }

    const merchantTransactionId = crypto.randomUUID();
    const payment = await PhonePePaymentModel.createPendingPayment({
      orderId: payload.orderId,
      amount: payload.amountRupees,
      merchantTransactionId,
    });

    if (payment.error) {
      throw payment.error;
    }

    let phonePe: Awaited<ReturnType<typeof initiatePhonePePayment>>;

    try {
      phonePe = await initiatePhonePePayment({
        merchantTransactionId,
        amountRupees: payload.amountRupees,
        orderId: payload.orderId,
      });
    } catch (error) {
      await PhonePePaymentModel.markFailed(payment.data.id, {
        initiationFailed: true,
        message: error instanceof Error ? error.message : "PhonePe initiation failed",
      });
      throw error;
    }

    return ok({
      ...phonePe,
      paymentId: payment.data.id,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function callback(request: NextRequest) {
  try {
    const body = phonePeCallbackSchema.parse(await parsePhonePeCallbackBody(request));
    const verified = verifyPhonePeCallbackChecksum(body.response, request.headers.get("x-verify"));

    if (!verified) {
      return ok({ received: true, verified: false });
    }

    const decoded = decodePhonePeCallbackResponse(body.response);
    const merchantTransactionId = decoded.data?.merchantTransactionId;

    if (!merchantTransactionId) {
      return ok({ received: true, verified: true, ignored: true });
    }

    const payment = await PhonePePaymentModel.findByMerchantTransactionId(merchantTransactionId, true);

    if (!payment.data) {
      return ok({ received: true, verified: true, ignored: true });
    }

    if (isPhonePeSuccess(decoded)) {
      await PhonePePaymentModel.confirmPayment({
        orderId: payment.data.order_id,
        paymentId: payment.data.id,
        reference: merchantTransactionId,
        metadata: decoded as Record<string, unknown>,
      });
    } else {
      await PhonePePaymentModel.markFailed(payment.data.id, decoded as Record<string, unknown>, true);
    }

    return ok({ received: true, verified: true });
  } catch {
    return ok({ received: true });
  }
}

async function parsePhonePeCallbackBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return { response: form.get("response") };
  }

  const text = await request.text();

  try {
    return JSON.parse(text);
  } catch {
    return { response: text };
  }
}

export async function status(request: NextRequest) {
  try {
    const payload = phonePeStatusSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const phonePeStatus = await verifyPhonePePayment(payload.merchantTransactionId);
    const payment = await PhonePePaymentModel.findByMerchantTransactionId(payload.merchantTransactionId);

    if (!payment.data) {
      return fail(new Error("Payment not found"), 404);
    }

    if (isPhonePeSuccess(phonePeStatus) && payment.data.status !== "COMPLETED") {
      await PhonePePaymentModel.confirmPayment({
        orderId: payment.data.order_id,
        paymentId: payment.data.id,
        reference: payload.merchantTransactionId,
        metadata: phonePeStatus as Record<string, unknown>,
      });
    }

    if (isPhonePeFailed(phonePeStatus) && payment.data.status === "PENDING") {
      await PhonePePaymentModel.markFailed(payment.data.id, phonePeStatus as Record<string, unknown>);
    }

    const refreshed = await PhonePePaymentModel.findByMerchantTransactionId(payload.merchantTransactionId);
    const normalizedStatus = normalizePhonePeStatus(phonePeStatus, refreshed.data?.status);
    const receipt =
      normalizedStatus === "COMPLETED" && refreshed.data?.order_id
        ? await OrderModel.findReceipt(refreshed.data.order_id)
        : null;

    return ok({
      status: normalizedStatus,
      merchantTransactionId: payload.merchantTransactionId,
      orderId: refreshed.data?.order_id,
      receipt: receipt?.data ?? null,
      raw: phonePeStatus,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function cancel(request: NextRequest) {
  try {
    const payload = cancelPhonePeSchema.parse(await request.json());
    const payment = await PhonePePaymentModel.findByMerchantTransactionId(payload.merchantTransactionId);

    if (!payment.data) {
      return fail(new Error("Payment not found"), 404);
    }

    const failed = await PhonePePaymentModel.markFailed(payment.data.id, {
      cancelledByClient: true,
      cancelledAt: new Date().toISOString(),
    });

    if (failed.error) {
      throw failed.error;
    }

    return ok({ status: "FAILED", merchantTransactionId: payload.merchantTransactionId });
  } catch (error) {
    return fail(error);
  }
}

async function requireAllowedRole() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (error) {
    throw error;
  }

  if (!allowedRoles.has(data.role)) {
    throw new Error("Insufficient permissions");
  }
}

function isPhonePeSuccess(value: unknown) {
  const parsed = phonePeStatusResponseSchema.safeParse(value);
  return parsed.success && (parsed.data.success === true || parsed.data.code === "PAYMENT_SUCCESS" || parsed.data.data?.state === "COMPLETED");
}

function isPhonePeFailed(value: unknown) {
  const parsed = phonePeStatusResponseSchema.safeParse(value);
  return parsed.success && (parsed.data.success === false || parsed.data.data?.state === "FAILED" || parsed.data.code === "PAYMENT_ERROR");
}

function normalizePhonePeStatus(value: unknown, localStatus?: string) {
  if (localStatus === "COMPLETED" || isPhonePeSuccess(value)) return "COMPLETED";
  if (localStatus === "FAILED" || isPhonePeFailed(value)) return "FAILED";
  return "PENDING";
}

const phonePeStatusResponseSchema = z.object({
  success: z.boolean().optional(),
  code: z.string().optional(),
  data: z
    .object({
      state: z.string().optional(),
    })
    .optional(),
});
