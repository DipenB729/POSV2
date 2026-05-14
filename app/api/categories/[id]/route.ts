import type { NextRequest } from "next/server";

import * as CategoryController from "@/controllers/catalog/category.controller";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export function GET(request: NextRequest, { params }: Params) {
  return CategoryController.get(request, params.id);
}

export function PATCH(request: NextRequest, { params }: Params) {
  return CategoryController.update(request, params.id);
}

export function DELETE(request: NextRequest, { params }: Params) {
  return CategoryController.softDelete(request, params.id);
}
