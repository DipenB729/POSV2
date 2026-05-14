import type { NextRequest } from "next/server";

import * as PhonePeController from "@/controllers/payments/phonepe.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return PhonePeController.status(request);
}
