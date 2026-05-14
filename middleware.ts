import type { NextRequest } from "next/server";

import { updateSession } from "@/src/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/payments/phonepe/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
