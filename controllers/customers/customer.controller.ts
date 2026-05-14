import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { demoCustomers, isSupabasePlaceholder } from "@/lib/demo-data";
import * as CustomerModel from "@/models/customers/customer.model";

export async function list(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    if (isSupabasePlaceholder()) {
      return ok(demoCustomers.filter((customer) => (search ? customer.name.toLowerCase().includes(search.toLowerCase()) : true)));
    }

    const { data, error } = await CustomerModel.findAll(search);

    if (error) {
      throw error;
    }

    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}
