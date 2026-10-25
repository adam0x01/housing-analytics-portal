import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calculator,
  History,
  Ruler,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { HistoryPage, MarketOverview } from "@/lib/types";
import { date, number } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaPriceChart, DistributionChart } from "@/components/charts";
import {
  EmptyState,
  ErrorNotice,
  StatCard,
} from "@/components/page-parts";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  // Independent panels remain usable when one application API is unavailable.
  const [marketResult, historyResult] = await Promise.allSettled([
    serverApi<MarketOverview>("market", "market/overview"),
    serverApi<HistoryPage>("estimator", "estimates?page_size=4"),
  ]);

  const market =
    marketResult.status === "fulfilled" ? marketResult.value : null;
  const history =
    historyResult.status === "fulfilled" ? historyResult.value : null;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reference properties"
          value={number(market?.summary.dataset_count)}
          note="Labelled homes in the supplied dataset"
          icon={Building2}
        />
        <StatCard
          label="Median property price"
          value={number(market?.summary.median_price)}
          note="Source price units · currency unspecified"
          icon={BarChart3}
        />
        <StatCard
          label="Average floor area"
          value={market ? `${number(market.summary.average_area)} sq ft` : "—"}
          note="Across the reference property sample"
          icon={Ruler}
        />
        <StatCard
          label="Saved estimates"
          value={number(history?.total)}
          note="Your estimates, retained across sessions"
          icon={History}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Link href="/estimator" className="group block">
          <Card className="h-full gap-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[.07] to-card py-0 shadow-none transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="rounded-xl bg-primary/10 p-3 text-primary">
                <Calculator className="size-6" strokeWidth={1.6} />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    Property value estimator
                  </h2>
                  <ArrowUpRight className="size-5 text-primary" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create and compare estimates.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/market" className="group block">
          <Card className="h-full gap-0 py-0 shadow-none transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="rounded-xl bg-secondary p-3 text-foreground">
                <BarChart3 className="size-6" strokeWidth={1.6} />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    Property market analysis
                  </h2>
                  <ArrowUpRight className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Filter properties and explore scenarios.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      {market ? (
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <Card className="min-w-0 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm">
                  Price by floor area
                </CardTitle>
                <CardDescription className="mt-1.5 text-xs">
                  Observed prices by floor area in the reference sample
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">
                {market.summary.property_count} properties
              </Badge>
            </CardHeader>
            <CardContent>
              <AreaPriceChart properties={market.properties} />
              <div className="mt-1 flex justify-center gap-5 text-[10px] text-muted-foreground">
                {market.segments.map((segment, index) => (
                  <span
                    key={segment.bedrooms}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: `var(--chart-${index + 1})` }}
                    />
                    {segment.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Price distribution</CardTitle>
              <CardDescription className="text-xs">
                Property count within each price band
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DistributionChart data={market.distribution} />
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Price bands in source dataset units
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <ErrorNotice
          title="Market data is temporarily unavailable"
          message="You can still open the estimator while the market service reconnects."
        />
      )}
      <div>
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent estimates</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/estimator/history" className="text-xs">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {history?.items.length ? (
              <div className="divide-y">
                {history.items.map((estimate) => (
                  <div
                    key={estimate.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="rounded-lg bg-secondary p-2 text-muted-foreground">
                      <Building2 className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {estimate.name}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {number(estimate.features.square_footage)} sq ft ·{" "}
                        {estimate.features.bedrooms} beds ·{" "}
                        {date(estimate.created_at)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {number(estimate.price)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={History}
                title={
                  history
                    ? "Your next insight starts here"
                    : "Estimate history is unavailable"
                }
                description={
                  history
                    ? "Create your first property estimate. It will appear here automatically."
                    : "Check that the estimator service is running, then refresh the page."
                }
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/estimator">Create an estimate</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
