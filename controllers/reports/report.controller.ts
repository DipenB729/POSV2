import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { requireRole, resolveScopedStore } from "@/lib/auth/roles";
import * as ReportModel from "@/models/reports/report.model";
import {
  dateRangeReportSchema,
  periodReportSchema,
  storeReportSchema,
  topProductsReportSchema,
} from "@/schemas/reports/report.schema";

const reportRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;

export async function salesSummary(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = dateRangeReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.salesSummary({
      storeId: resolveScopedStore(profile, params.storeId),
      from: params.from,
      to: params.to,
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function revenueByPeriod(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = periodReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.revenueByPeriod({
      storeId: resolveScopedStore(profile, params.storeId),
      period: params.period,
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function topProducts(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = topProductsReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.topProducts({
      storeId: resolveScopedStore(profile, params.storeId),
      from: params.from,
      to: params.to,
      limit: params.limit,
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function inventoryValuation(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = storeReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.inventoryValuation({
      storeId: resolveScopedStore(profile, params.storeId),
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function cashierPerformance(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = dateRangeReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.cashierPerformance({
      storeId: resolveScopedStore(profile, params.storeId),
      from: params.from,
      to: params.to,
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function customerInsights(request: NextRequest) {
  try {
    const profile = await requireRole([...reportRoles]);
    const params = storeReportSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await ReportModel.customerInsights({
      storeId: resolveScopedStore(profile, params.storeId),
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
