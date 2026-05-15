import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { detailedReport, detailedReportTypes, isDetailedReportType } from "@/models/reports/detailed-report.model";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { reportType: string };
  searchParams?: {
    from?: string;
    to?: string;
  };
};

export default async function DetailedReportPage({ params, searchParams }: PageProps) {
  if (!isDetailedReportType(params.reportType)) notFound();

  const report = await detailedReport(params.reportType, {
    from: searchParams?.from,
    to: searchParams?.to,
  });
  const dateFrom = report.from.slice(0, 10);
  const dateTo = report.to.slice(0, 10);
  const exportHref = `/api/reports/detail/${report.type}/export?from=${dateFrom}&to=${dateTo}`;

  return (
    <AppShell>
      <div className="space-y-5 print:space-y-4">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 print:hidden">
                <ArrowLeft className="size-4" />
                Reports
              </Link>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500 print:mt-0">Detailed Business Report</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{report.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{report.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2.5 py-1">From: {dateFrom}</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1">To: {dateTo}</span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">{report.rows.length} rows</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <PrintButton />
              <Button size="sm" render={<Link href={exportHref} />}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {report.totals.map((total) => (
            <div key={total.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{total.label}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{total.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm print:hidden">
          <form action={`/reports/detail/${report.type}`} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">From</span>
              <input className="input" name="from" type="date" defaultValue={dateFrom} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">To</span>
              <input className="input" name="to" type="date" defaultValue={dateTo} />
            </label>
            <Button type="submit">
              <Search className="size-4" />
              Apply
            </Button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm print:border-slate-300 print:shadow-none">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detailed Rows</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{report.title}</h2>
            </div>
            <FileSpreadsheet className="size-6 text-emerald-600 print:hidden" />
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
                    <tr key={`${report.type}-${rowIndex}`} className="bg-white">
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`} className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={report.columns.length}>
                      No data found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 print:hidden">
          {detailedReportTypes.map((detail) => (
            <Link
              key={detail.type}
              href={`/reports/detail/${detail.type}?from=${dateFrom}&to=${dateTo}`}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-900">{detail.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{detail.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
