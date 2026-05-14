import type { NextRequest } from "next/server";

import * as OrderController from "@/controllers/sales/order.controller";
import { fail } from "@/controllers/http";
import { rateLimit } from "@/lib/rate-limit/memory";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  const limited = rateLimit(`orders:${request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown"}`, 60);
  if (limited.limited) return fail(new Error("Rate limit exceeded"), 429);
  return OrderController.create(request);
}
