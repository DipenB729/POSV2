import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { requireRole } from "@/lib/auth/roles";
import * as ExpenseModel from "@/models/expenses/expense.model";
import { createExpenseSchema } from "@/schemas/expenses/expense.schema";

export async function create(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
    const payload = createExpenseSchema.parse(await request.json());
    const { data, error } = await ExpenseModel.createExpense(payload);

    if (error) {
      throw error;
    }

    return ok({ expenseId: data }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
