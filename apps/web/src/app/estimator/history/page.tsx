import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { EstimatorNavigation } from "@/components/estimator-navigation";
import { HistoryWorkspace } from "@/components/history-workspace";
import { serverApi } from "@/lib/server-api";
import type { HistoryPage } from "@/lib/types";

export const metadata: Metadata = { title: "Estimate history" };

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const history = await serverApi<HistoryPage>(
    "estimator",
    "estimates?page=1&page_size=10",
  );

  return (
    <>
      <PageHeading
        eyebrow="Property estimator"
        title="Every estimate. One place."
        description="Revisit your results and bring the right properties into focus."
        action={
          <Button asChild>
            <Link href="/estimator">
              <Plus />
              New estimate
            </Link>
          </Button>
        }
      />
      <EstimatorNavigation />
      <HistoryWorkspace initial={history} />
    </>
  );
}
