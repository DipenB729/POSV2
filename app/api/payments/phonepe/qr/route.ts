import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated. Use POST /api/payments/phonepe/initiate.",
    },
    { status: 410 },
  );
}
