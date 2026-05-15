import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getLiveReportDetail } from "@/lib/reports/report-live-data";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: { reportSlug: string } }) {
  const report = await getLiveReportDetail(params.reportSlug);

  if (!report) notFound();

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-4" />
                Reports
              </Link>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">{report.group}</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{report.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2.5 py-1">Scope: {report.scope}</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1">Cadence: {report.cadence}</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1">{report.rows.length} rows</span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">Source: {report.source}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">
                <Printer className="size-4" />
                Print
              </Button>
              <Button size="sm">
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {report.message && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {report.message}
          </div>
        )}

        {report.metrics.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {report.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{metric.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">From</span>
                <input className="input" type="date" defaultValue="2026-05-01" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">To</span>
                <input className="input" type="date" defaultValue="2026-05-15" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">Property</span>
                <select className="input" defaultValue="main-branch">
                  <option value="main-branch">Main Branch</option>
                  <option value="all-property">All Property</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">Employee</span>
                <select className="input" defaultValue="all">
                  <option value="all">All employees</option>
                  {report.employees.map((employee) => (
                    <option key={employee} value={employee}>
                      {employee}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {report.columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.length > 0 ? (
                  report.rows.map((row, rowIndex) => (
                    <tr key={`${report.slug}-${rowIndex}`} className="bg-white hover:bg-slate-50">
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`} className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={report.columns.length}>
                      No live data found for this report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
