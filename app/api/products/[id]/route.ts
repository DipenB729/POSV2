import type { NextRequest } from "next/server";

import * as ProductController from "@/controllers/catalog/product.controller";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export function GET(request: NextRequest, { params }: Params) {
  return ProductController.get(request, params.id);
}

export function PATCH(request: NextRequest, { params }: Params) {
  return ProductController.update(request, params.id);
}

export function DELETE(request: NextRequest, { params }: Params) {
  return ProductController.softDelete(request, params.id);
}
