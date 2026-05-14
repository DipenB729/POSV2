import type { NextRequest } from "next/server";

import * as CategoryController from "@/controllers/catalog/category.controller";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return CategoryController.list(request);
}

export function POST(request: NextRequest) {
  return CategoryController.create(request);
}
