import { NextResponse } from "next/server";

import { detailedReport, isDetailedReportType, reportToCsv } from "@/models/reports/detailed-report.model";

type RouteContext = {
  params: { reportType: string };
};

export async function GET(request: Request, { params }: RouteContext) {
  if (!isDetailedReportType(params.reportType)) {
    return NextResponse.json({ error: "Unknown report type." }, { status: 404 });
  }

  const url = new URL(request.url);
  const report = await detailedReport(params.reportType, {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const csv = reportToCsv(report);
  const fileName = `${report.type}-${report.from.slice(0, 10)}-${report.to.slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
