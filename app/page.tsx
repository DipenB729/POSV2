import { MainDashboard } from "@/views/dashboard/main-dashboard";

export const dynamic = "force-dynamic";

export default function Home({ searchParams }: { searchParams?: { range?: string } }) {
  const range = searchParams?.range === "week" || searchParams?.range === "month" ? searchParams.range : "today";
  return <MainDashboard range={range} />;
}
