import type { NextRequest } from "next/server";

import * as ProductController from "@/controllers/catalog/product.controller";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export function POST(request: NextRequest, { params }: Params) {
  return ProductController.uploadImage(request, params.id);
}
