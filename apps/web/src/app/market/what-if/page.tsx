import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { WhatIfWorkspace } from "@/components/what-if-workspace";
import { serverApi } from "@/lib/server-api";
import type { MarketOverview } from "@/lib/types";
export const metadata: Metadata = { title: "What-if studio" };
export const dynamic = "force-dynamic";
export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const [query, market] = await Promise.all([
    searchParams,
    serverApi<MarketOverview>("market", "market/overview"),
  ]);
  const initial =
    market.properties.find((item) => item.id === Number(query.property)) ??
    market.properties[0];
  return (
    <>
      <PageHeading
        eyebrow="Market analysis"
        title="Explore a different possibility."
        description="Change the inputs. Compare the outcomes. Understand how the model responds."
        action={
          <Button variant="outline" asChild>
            <Link href="/market">
              <ArrowLeft />
              Market dashboard
            </Link>
          </Button>
        }
      />
      <WhatIfWorkspace
        properties={market.properties}
        initialProperty={initial.id}
      />
    </>
  );
}
