import type { NextRequest } from "next/server";

import * as ProductController from "@/controllers/catalog/product.controller";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return ProductController.list(request);
}

export function POST(request: NextRequest) {
  return ProductController.create(request);
}
