import type { NextRequest } from "next/server";

import * as RefundController from "@/controllers/refunds/refund.controller";
import { fail } from "@/controllers/http";
import { rateLimit } from "@/lib/rate-limit/memory";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  const limited = rateLimit(`refunds:${request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown"}`, 30);
  if (limited.limited) return fail(new Error("Rate limit exceeded"), 429);
  return RefundController.create(request);
}
