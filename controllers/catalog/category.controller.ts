import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/controllers/http";
import { demoCategories, isSupabasePlaceholder } from "@/lib/demo-data";
import * as CategoryModel from "@/models/catalog/category.model";
import { categoryQuerySchema, createCategorySchema, updateCategorySchema } from "@/schemas/category.schema";

const idSchema = z.string().uuid();

export async function list(request: NextRequest) {
  try {
    const filters = categoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    if (isSupabasePlaceholder()) {
      return ok(demoCategories.filter((category) => (filters.search ? category.name.toLowerCase().includes(filters.search.toLowerCase()) : true)));
    }

    const { data, error } = await CategoryModel.findAll(filters);

    if (error) {
      throw error;
    }

    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}

export async function get(_request: NextRequest, id: string) {
  try {
    const categoryId = idSchema.parse(id);
    const { data, error } = await CategoryModel.findById(categoryId);

    if (error) {
      throw error;
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function create(request: NextRequest) {
  try {
    const payload = createCategorySchema.parse(await request.json());
    const existing = await CategoryModel.findBySlug(payload.slug);

    if (existing.data) {
      return fail(new Error("A category with this slug already exists"), 409);
    }

    if (existing.error) {
      throw existing.error;
    }

    const { data, error } = await CategoryModel.create(payload);

    if (error) {
      throw error;
    }

    return ok(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function update(request: NextRequest, id: string) {
  try {
    const categoryId = idSchema.parse(id);
    const payload = updateCategorySchema.parse(await request.json());
    const { data, error } = await CategoryModel.update(categoryId, payload);

    if (error) {
      throw error;
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function softDelete(_request: NextRequest, id: string) {
  try {
    const categoryId = idSchema.parse(id);
    const { data, error } = await CategoryModel.softDelete(categoryId);

    if (error) {
      throw error;
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
