import type { NextRequest } from "next/server";

import * as PhonePeController from "@/controllers/payments/phonepe.controller";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return PhonePeController.cancel(request);
}
