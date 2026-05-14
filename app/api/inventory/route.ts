import type { NextRequest } from "next/server";

import * as StockController from "@/controllers/inventory/stock.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return StockController.list(request);
}
