import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/controllers/http";
import { demoInventory, isSupabasePlaceholder } from "@/lib/demo-data";
import * as InventoryModel from "@/models/inventory/inventory.model";
import {
  inventoryAdjustmentSchema,
  inventoryQuerySchema,
  movementHistoryQuerySchema,
} from "@/schemas/inventory.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

type InventoryRow = {
  quantity: number;
  reorder_point: number;
};

export async function list(request: NextRequest) {
  try {
    const filters = inventoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    if (isSupabasePlaceholder()) {
      const data = demoInventory.filter((item) => (filters.lowStock ? item.quantity <= item.reorder_point : true));
      return ok(data, { meta: { page: filters.page, limit: filters.limit, total: data.length } });
    }

    const { data, error, count } = await InventoryModel.findAll(filters);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as InventoryRow[];
    const filtered = filters.lowStock
      ? rows.filter((item) => item.quantity <= item.reorder_point)
      : rows;

    return ok(filtered, {
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: filters.lowStock ? filtered.length : count ?? 0,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function get(_request: NextRequest, id: string) {
  try {
    const inventoryItemId = idSchema.parse(id);
    const { data, error } = await InventoryModel.findById(inventoryItemId);

    if (error) {
      throw error;
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function movements(request: NextRequest) {
  try {
    const filters = movementHistoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    if (isSupabasePlaceholder()) {
      return ok([]);
    }

    const { data, error, count } = await InventoryModel.findMovements(filters);

    if (error) {
      throw error;
    }

    return ok(data ?? [], {
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count ?? 0,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function adjust(request: NextRequest) {
  try {
    const payload = inventoryAdjustmentSchema.parse(await request.json());
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return fail(new Error("Authentication required"), 401);
    }

    const { error } = await InventoryModel.recordMovement(payload, user.id);

    if (error) {
      throw error;
    }

    const updated = await InventoryModel.findById(payload.inventoryItemId);

    if (updated.error) {
      throw updated.error;
    }

    return ok(updated.data);
  } catch (error) {
    return fail(error);
  }
}
