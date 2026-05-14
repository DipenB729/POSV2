import type { NextRequest } from "next/server";

import * as ReportController from "@/controllers/reports/report.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return ReportController.inventoryValuation(request);
}
