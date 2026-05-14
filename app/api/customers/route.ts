import type { NextRequest } from "next/server";

import * as CustomerController from "@/controllers/customers/customer.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return CustomerController.list(request);
}
