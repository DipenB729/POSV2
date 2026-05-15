import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { createPosOrder } from "@/controllers/sales/sale.controller";
import { isSupabasePlaceholder } from "@/lib/demo-data";
import * as OrderModel from "@/models/sales/order.model";
import { terminalOrderSchema, type TerminalOrderInput } from "@/schemas/terminal-order.schema";

export async function create(request: NextRequest) {
  try {
    const payload = terminalOrderSchema.parse(await request.json());
    const subtotal = payload.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const tax = payload.items.reduce(
      (total, item) => total + item.unitPrice * item.quantity * (item.taxRate / 100),
      0,
    );
    const discountAmount = payload.discount?.amount ?? 0;
    const total = roundMoney(Math.max(subtotal + tax - discountAmount, 0));

    if (isSupabasePlaceholder()) {
      if (payload.paymentMethod === "CASH" && payload.amountTendered < total) {
        return fail(new Error("Payment amount is less than order total"), 400);
      }

      return ok(createDemoReceipt(payload, total), { status: 201 });
    }

    if (payload.paymentMethod === "PHONEPE_QR") {
      const stock = await OrderModel.validateStock(payload);

      if (!stock.ok) {
        return fail(new Error(stock.error), 409);
      }

      const pendingOrder = await OrderModel.createPendingPhonePeOrder(payload, discountAmount);

      if (pendingOrder.error) {
        throw pendingOrder.error;
      }

      const receipt = await OrderModel.findReceipt(pendingOrder.data as string);

      if (receipt.error) {
        throw receipt.error;
      }

      return ok(receipt.data, { status: 201 });
    }

    if (payload.paymentMethod === "ESEWA_QR") {
      const stock = await OrderModel.validateStock(payload);

      if (!stock.ok) {
        return fail(new Error(stock.error), 409);
      }

      const orderId = await createPosOrder({
        storeId: payload.storeId,
        customerId: payload.customerId,
        items: payload.items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId ?? null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          discount: item.discount ?? 0,
        })),
        payments: [
          {
            method: "ESEWA_QR",
            amount: total,
            status: "COMPLETED",
            reference: payload.paymentReference ?? "manual-esewa",
            metadata: {
              manualConfirmation: true,
              discount: payload.discount ?? null,
            },
          },
        ],
        notes: payload.notes,
      });

      const receipt = await OrderModel.findReceipt(orderId);

      if (receipt.error) {
        throw receipt.error;
      }

      return ok(receipt.data, { status: 201 });
    }

    if (payload.amountTendered < total) {
      return fail(new Error("Payment amount is less than order total"), 400);
    }

    const stock = await OrderModel.validateStock(payload);

    if (!stock.ok) {
      return fail(new Error(stock.error), 409);
    }

    const orderId = await createPosOrder({
      storeId: payload.storeId,
      customerId: payload.customerId,
      items: payload.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        discount: item.discount ?? 0,
      })),
      payments: [
        {
          method: payload.paymentMethod,
          amount: total,
          status: "COMPLETED",
          reference: payload.paymentReference ?? undefined,
          metadata: {
            amountTendered: payload.amountTendered,
            discount: payload.discount ?? null,
          },
        },
      ],
      notes: payload.notes,
    });

    const receipt = await OrderModel.findReceipt(orderId);

    if (receipt.error) {
      throw receipt.error;
    }

    return ok(receipt.data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function createDemoReceipt(payload: TerminalOrderInput, total: number) {
  const amountPaid = payload.paymentMethod === "CASH" || payload.paymentMethod === "ESEWA_QR" ? payload.amountTendered || total : 0;
  const orderId = crypto.randomUUID();

  return {
    id: orderId,
    order_number: `DEMO-${Date.now()}`,
    total_amount: total,
    amount_paid: amountPaid,
    change_due: roundMoney(Math.max(amountPaid - total, 0)),
    created_at: new Date().toISOString(),
    order_items: payload.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate,
      discount: item.discount ?? 0,
      line_total: roundMoney(item.unitPrice * item.quantity * (1 + item.taxRate / 100) - (item.discount ?? 0)),
    })),
    payments:
      payload.paymentMethod === "CASH" || payload.paymentMethod === "ESEWA_QR"
        ? [
            {
              method: payload.paymentMethod,
              amount: total,
              reference: payload.paymentReference ?? null,
            },
          ]
        : [],
  };
}
