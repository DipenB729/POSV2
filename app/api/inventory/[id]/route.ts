import type { NextRequest } from "next/server";

import * as StockController from "@/controllers/inventory/stock.controller";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export function GET(request: NextRequest, { params }: Params) {
  return StockController.get(request, params.id);
}
