import type { NextRequest } from "next/server";

import * as ExpenseController from "@/controllers/expenses/expense.controller";
import { fail } from "@/controllers/http";
import { rateLimit } from "@/lib/rate-limit/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  const limited = rateLimit(`expenses:${request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown"}`, 30);
  if (limited.limited) return fail(new Error("Rate limit exceeded"), 429);
  return ExpenseController.create(request);
}
