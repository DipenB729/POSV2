import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { isSupabasePlaceholder } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scannerId = "phonepe_qr";
const bucketName = "payment-scanners";

export async function GET() {
  try {
    if (isSupabasePlaceholder()) {
      return ok({
        provider: "ESEWA_QR",
        qrImageUrl: null,
        merchantName: "Dipen Store",
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("payment_scanner_settings")
      .select("provider, qr_image_url, storage_path, upi_id, merchant_name, updated_at")
      .eq("id", scannerId)
      .maybeSingle();

    if (error) {
      if (isMissingScannerTable(error)) {
        return fail(new Error("Run the payment scanner migration before uploading an eSewa QR scanner."), 400);
      }
      throw error;
    }

    return ok({
      provider: data?.provider ?? "ESEWA_QR",
      qrImageUrl: data?.qr_image_url ?? null,
      storagePath: data?.storage_path ?? null,
      merchantName: data?.merchant_name ?? "Dipen Store",
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isSupabasePlaceholder()) {
      return fail(new Error("Connect a real Supabase database before uploading the eSewa QR scanner."), 400);
    }

    const form = await request.formData();
    const file = form.get("file");
    const merchantName = form.get("merchantName");

    if (typeof merchantName === "string") {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("payment_scanner_settings")
        .upsert(
          {
            id: scannerId,
            provider: "ESEWA_QR",
            merchant_name: merchantName.trim() ? merchantName.trim() : "Dipen Store",
          },
          { onConflict: "id" },
        )
        .select("provider, qr_image_url, storage_path, upi_id, merchant_name, updated_at")
        .single();

      if (error) {
        if (isMissingScannerTable(error)) {
          return fail(new Error("Run the payment scanner migration before saving scanner settings."), 400);
        }
        throw error;
      }

      if (!(file instanceof File)) {
        return ok({
          provider: data.provider,
          qrImageUrl: data.qr_image_url,
          storagePath: data.storage_path,
          merchantName: data.merchant_name,
          updatedAt: data.updated_at,
        });
      }
    }

    if (!(file instanceof File)) {
      return fail(new Error("QR image file is required"), 400);
    }

    if (!file.type.startsWith("image/")) {
      return fail(new Error("Only image files are supported"), 400);
    }

    const supabase = createSupabaseAdminClient();
    await ensureBucket(supabase);

    const extension = file.name.split(".").pop() || "png";
    const path = `esewa/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(bucketName).upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

    if (upload.error) {
      throw upload.error;
    }

    const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(path);
    const { data, error } = await supabase
      .from("payment_scanner_settings")
      .upsert(
        {
          id: scannerId,
          provider: "ESEWA_QR",
          qr_image_url: publicUrl.publicUrl,
          storage_path: path,
          merchant_name: typeof merchantName === "string" && merchantName.trim() ? merchantName.trim() : undefined,
        },
        { onConflict: "id" },
      )
      .select("provider, qr_image_url, storage_path, upi_id, merchant_name, updated_at")
      .single();

    if (error) {
      if (isMissingScannerTable(error)) {
          return fail(new Error("Run the payment scanner migration before uploading an eSewa QR scanner."), 400);
      }
      throw error;
    }

    return ok(
      {
        provider: data.provider,
        qrImageUrl: data.qr_image_url,
        storagePath: data.storage_path,
        merchantName: data.merchant_name,
        updatedAt: data.updated_at,
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}

function isMissingScannerTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "PGRST205"
  );
}

async function ensureBucket(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const bucket = await supabase.storage.getBucket(bucketName);

  if (!bucket.error) {
    return;
  }

  const created = await supabase.storage.createBucket(bucketName, {
    public: true,
  });

  if (created.error) {
    throw created.error;
  }
}
