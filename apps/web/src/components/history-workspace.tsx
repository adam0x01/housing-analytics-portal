"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  History,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Estimate, HistoryPage } from "@/lib/types";
import { date, featureLabels, featureNumber, number } from "@/lib/format";
import { useApiAction } from "@/hooks/use-api-action";
import { useComparison } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNotice } from "@/components/page-parts";

/** Pages through persisted estimates while comparison selection stays shared. */
export function HistoryWorkspace({ initial }: { initial: HistoryPage }) {
  const [history, setHistory] = useState(initial);
  const [detail, setDetail] = useState<Estimate | null>(null);
  const { ids, toggle, clear } = useComparison();
  const { run, pending, error } = useApiAction();

  async function changePage(page: number) {
    const result = await run((signal) =>
      api<HistoryPage>("estimator", `estimates?page=${page}&page_size=10`, {
        signal,
      }),
    );

    if (result) setHistory(result);
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}
      <Card className="gap-0 shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div>
            <CardTitle className="text-sm">
              Saved estimates{" "}
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {history.total}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs">
              Select two to four properties to compare their details.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {ids.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-xs"
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              disabled={ids.length < 2}
              asChild={ids.length >= 2}
              className="text-xs"
            >
              {ids.length >= 2 ? (
                <Link href={`/estimator/compare?ids=${ids.join(",")}`}>
                  <GitCompareArrows />
                  Compare selected ({ids.length})
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <GitCompareArrows className="size-3.5" />
                  Compare selected ({ids.length})
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        {history.total === 0 ? (
          <EmptyState
            icon={History}
            title="A home for every estimate"
            description="Your successful estimates will be saved here with their original inputs and model version."
            action={
              <Button asChild>
                <Link href="/estimator">
                  <Plus />
                  Create your first estimate
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/35 hover:bg-secondary/35">
                  <TableHead className="w-12 pl-5">
                    <span className="sr-only">Select for comparison</span>
                  </TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Floor area</TableHead>
                  <TableHead className="text-center">Beds / baths</TableHead>
                  <TableHead className="text-right">Estimated price</TableHead>
                  <TableHead className="pl-6">Created (HKT)</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending
                  ? [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="p-5">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : history.items.map((estimate) => (
                      <TableRow
                        key={estimate.id}
                        data-state={
                          ids.includes(estimate.id) ? "selected" : undefined
                        }
                      >
                        <TableCell className="pl-5">
                          <Checkbox
                            aria-label={`Compare ${estimate.name}`}
                            checked={ids.includes(estimate.id)}
                            disabled={
                              !ids.includes(estimate.id) && ids.length >= 4
                            }
                            onCheckedChange={() => toggle(estimate.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            className="flex items-center gap-3 text-left"
                            onClick={() => setDetail(estimate)}
                          >
                            <span className="rounded-lg border bg-secondary/50 p-2 text-muted-foreground">
                              <Building2 className="size-4" />
                            </span>
                            <span>
                              <span className="block max-w-48 truncate text-xs font-medium">
                                {estimate.name}
                              </span>
                              <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                                #{estimate.id.slice(0, 8)}
                              </span>
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {number(estimate.features.square_footage)}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            sq ft
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {estimate.features.bedrooms} /{" "}
                          {estimate.features.bathrooms}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">
                          {number(estimate.price)}
                        </TableCell>
                        <TableCell className="pl-6 text-[11px] text-muted-foreground">
                          {date(estimate.created_at)}
                        </TableCell>
                        <TableCell className="pr-5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View details for ${estimate.name}`}
                            onClick={() => setDetail(estimate)}
                          >
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-5 py-4">
              <p className="text-[11px] text-muted-foreground">
                Showing {(history.page - 1) * history.page_size + 1}–
                {Math.min(history.page * history.page_size, history.total)} of{" "}
                {history.total} estimates
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={pending || history.page === 1}
                  onClick={() => changePage(history.page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span className="px-1 text-[11px] text-muted-foreground">
                  Page {history.page} of{" "}
                  {Math.ceil(history.total / history.page_size)}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={
                    pending || history.page * history.page_size >= history.total
                  }
                  onClick={() => changePage(history.page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <p className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
        <History className="size-3" />
        Estimates retain their original model version. Prices use source dataset
        units.
      </p>
      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detail?.name}</SheetTitle>
            <SheetDescription>
              Saved property estimate · {detail ? date(detail.created_at) : ""}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="space-y-6 px-6 pb-8">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-xs text-muted-foreground">
                  Estimated property value
                </p>
                <p className="mt-2 text-3xl font-semibold text-primary tabular-nums">
                  {number(detail.price, 2)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Source price units
                </p>
              </div>
              <dl className="divide-y">
                {Object.entries(detail.features).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">
                      {featureLabels[key]}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {featureNumber(key, value)}
                      {key === "square_footage" ? " sq ft" : ""}
                    </dd>
                  </div>
                ))}
              </dl>
              {detail.warnings.map((warning) => (
                <p
                  key={warning}
                  className="text-xs leading-5 text-amber-700 dark:text-amber-400"
                >
                  {warning}
                </p>
              ))}
              <p className="break-all font-mono text-[10px] text-muted-foreground">
                {detail.model_version}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
