import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/server/logging/logger";

export type ApiResponse<T> =
  | {
      ok: true;
      data: T;
      meta?: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
      issues?: unknown;
    };

export function ok<T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }) {
  return NextResponse.json<ApiResponse<T>>(
    {
      ok: true,
      data,
      meta: init?.meta,
    },
    init,
  );
}

export function fail(error: unknown, status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error: "Validation failed",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  logger.error("API request failed", {
    error: error instanceof Error ? error.message : error,
    status,
  });

  return NextResponse.json<ApiResponse<never>>(
    {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    },
    { status },
  );
}
