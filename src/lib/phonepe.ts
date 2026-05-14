import crypto from "crypto";

const BASE_URL = process.env.PHONEPE_BASE_URL!;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX!;

export function generatePhonePeChecksum(payload: string, endpoint: string): string {
  const value = payload + endpoint + SALT_KEY;
  const sha256 = crypto.createHash("sha256").update(value).digest("hex");
  return `${sha256}###${SALT_INDEX}`;
}

export function buildPaymentPayload(params: {
  merchantTransactionId: string;
  amount: number;
  redirectUrl: string;
  callbackUrl: string;
  mobileNumber?: string;
}) {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: params.merchantTransactionId,
    merchantUserId: "POS_TERMINAL",
    amount: params.amount,
    redirectUrl: params.redirectUrl,
    redirectMode: "POST",
    callbackUrl: params.callbackUrl,
    mobileNumber: params.mobileNumber,
    paymentInstrument: { type: "PAY_PAGE" },
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export async function initiatePhonePePayment(params: {
  merchantTransactionId: string;
  amountRupees: number;
  orderId: string;
}) {
  const amountPaise = Math.round(params.amountRupees * 100);
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/phonepe/callback`;
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pos/payment-status/${params.orderId}`;

  const base64Payload = buildPaymentPayload({
    merchantTransactionId: params.merchantTransactionId,
    amount: amountPaise,
    redirectUrl,
    callbackUrl,
  });

  const endpoint = "/pg/v1/pay";
  const checksum = generatePhonePeChecksum(base64Payload, endpoint);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "PhonePe initiation failed");
  }

  return {
    redirectUrl: data.data.instrumentResponse.redirectInfo.url as string,
    merchantTransactionId: params.merchantTransactionId,
  };
}

export async function verifyPhonePePayment(merchantTransactionId: string) {
  const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const checksum = generatePhonePeChecksum("", endpoint);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
      "X-MERCHANT-ID": MERCHANT_ID,
    },
  });

  return response.json();
}

export async function refundPhonePePayment(params: {
  merchantTransactionId: string;
  originalTransactionId: string;
  amountRupees: number;
}) {
  const endpoint = "/pg/v1/refund";
  const payload = {
    merchantId: MERCHANT_ID,
    merchantUserId: "POS_TERMINAL",
    merchantTransactionId: params.merchantTransactionId,
    originalTransactionId: params.originalTransactionId,
    amount: Math.round(params.amountRupees * 100),
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum = generatePhonePeChecksum(base64Payload, endpoint);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    },
    body: JSON.stringify({ request: base64Payload }),
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "PhonePe refund failed");
  }

  return data;
}

export function decodePhonePeCallbackResponse(response: string) {
  return JSON.parse(Buffer.from(response, "base64").toString("utf8")) as {
    success?: boolean;
    code?: string;
    message?: string;
    data?: {
      merchantTransactionId?: string;
      transactionId?: string;
      amount?: number;
      state?: string;
      responseCode?: string;
    };
  };
}

export function verifyPhonePeCallbackChecksum(responsePayload: string, receivedChecksum: string | null) {
  if (!receivedChecksum) {
    return false;
  }

  const expected = Buffer.from(generatePhonePeChecksum(responsePayload, ""));
  const received = Buffer.from(receivedChecksum);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
