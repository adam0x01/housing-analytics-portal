import type { Metadata } from "next";
import { PageHeading } from "@/components/page-parts";
import { EstimatorNavigation } from "@/components/estimator-navigation";
import { ComparisonWorkspace } from "@/components/comparison-workspace";
import { serverApi } from "@/lib/server-api";
import type { HistoryPage } from "@/lib/types";
export const metadata: Metadata = { title: "Compare properties" };
export const dynamic = "force-dynamic";
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const query = await searchParams;
  const ids = (query.ids ?? "")
    .split(",")
    .filter((id) => /^[0-9a-f-]{36}$/.test(id));
  const history = await serverApi<HistoryPage>(
    "estimator",
    "estimates?page_size=100",
  );
  return (
    <>
      <PageHeading
        eyebrow="Property estimator"
        title="See the differences that matter."
        description="Compare up to four saved property estimates with a consistent view of every feature."
      />
      <EstimatorNavigation />
      <ComparisonWorkspace
        recent={history.items}
        initialIds={[...new Set(ids)].slice(0, 4)}
      />
    </>
  );
}
