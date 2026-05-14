import type { NextRequest } from "next/server";

import * as StockController from "@/controllers/inventory/stock.controller";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return StockController.adjust(request);
}
