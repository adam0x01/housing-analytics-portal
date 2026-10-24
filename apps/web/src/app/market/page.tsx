import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { MarketWorkspace } from "@/components/market-workspace";
import { serverApi } from "@/lib/server-api";
import type { MarketOverview } from "@/lib/types";
export const metadata: Metadata = { title: "Market analysis" };
export const dynamic = "force-dynamic";
export default async function MarketPage() {
  const market = await serverApi<MarketOverview>("market", "market/overview");
  return (
    <>
      <PageHeading
        eyebrow="Market analysis"
        title="Make the market data make sense."
        description="Explore the supplied property sample. Find a segment, inspect the details, and take your findings with you."
        action={
          <Button asChild variant="outline">
            <Link href="/market/what-if">
              <SlidersHorizontal />
              What-if studio
            </Link>
          </Button>
        }
      />
      <MarketWorkspace initial={market} />
    </>
  );
}
