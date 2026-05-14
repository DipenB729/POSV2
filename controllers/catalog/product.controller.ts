import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/controllers/http";
import { demoProducts, isSupabasePlaceholder } from "@/lib/demo-data";
import * as ProductModel from "@/models/inventory/product.model";
import { createProductSchema, productQuerySchema, updateProductSchema } from "@/schemas/product.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function list(request: NextRequest) {
  try {
    const filters = productQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    if (isSupabasePlaceholder()) {
      const data = demoProducts.filter((product) => {
        const matchesSearch = filters.search
          ? `${product.name} ${product.sku} ${product.barcode}`.toLowerCase().includes(filters.search.toLowerCase())
          : true;
        const matchesCategory = filters.categoryId ? product.category_id === filters.categoryId : true;
        const matchesActive = typeof filters.isActive === "boolean" ? product.is_active === filters.isActive : true;
        return matchesSearch && matchesCategory && matchesActive;
      });
      return ok(data, { meta: { page: filters.page, limit: filters.limit, total: data.length } });
    }

    const { data, error, count } = await ProductModel.findAll(filters);

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

export async function get(_request: NextRequest, id: string) {
  try {
    const productId = idSchema.parse(id);
    const { data, error } = await ProductModel.findById(productId);

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
    const payload = createProductSchema.parse(await request.json());
    const existing = await ProductModel.findBySku(payload.sku);

    if (existing.data) {
      return fail(new Error("A product with this SKU already exists"), 409);
    }

    if (existing.error) {
      throw existing.error;
    }

    const { data, error } = await ProductModel.create(payload);

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
    const productId = idSchema.parse(id);
    const payload = updateProductSchema.parse(await request.json());
    const { data, error } = await ProductModel.update(productId, payload);

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
    const productId = idSchema.parse(id);
    const { data, error } = await ProductModel.softDelete(productId);

    if (error) {
      throw error;
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function uploadImage(request: NextRequest, id: string) {
  try {
    const productId = idSchema.parse(id);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return fail(new Error("Image file is required"), 400);
    }

    const supabase = createSupabaseServerClient();
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `products/${productId}/${crypto.randomUUID()}.${extension}`;
    const bucket = process.env.S3_BUCKET || "product-images";
    const upload = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

    if (upload.error) {
      throw upload.error;
    }

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    const updated = await ProductModel.updateImage(productId, publicUrl.publicUrl);

    if (updated.error) {
      throw updated.error;
    }

    return ok(updated.data);
  } catch (error) {
    return fail(error);
  }
}
