"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, GitCompareArrows, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Estimate } from "@/lib/types";
import { featureLabels, featureNumber, number } from "@/lib/format";
import { useApiAction } from "@/hooks/use-api-action";
import { useComparison } from "@/components/providers";
import { PriceBars } from "@/components/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNotice } from "@/components/page-parts";

export function ComparisonWorkspace({
  recent,
  initialIds,
}: {
  recent: Estimate[];
  initialIds: string[];
}) {
  const { ids } = useComparison();
  const [selected, setSelected] = useState(
    initialIds.length ? initialIds : ids,
  );
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const { run, pending, error } = useApiAction();
  const key = selected.join(",");
  useEffect(() => {
    if (!key || key.split(",").length < 2) return;
    void run((signal) =>
      api<Estimate[]>("estimator", "estimates/compare", {
        method: "POST",
        body: JSON.stringify({ ids: key.split(",") }),
        signal,
      }),
    ).then((result) => {
      if (result) setEstimates(result);
    });
  }, [key, run]);
  const visible =
    selected.length >= 2 && estimates.map((item) => item.id).join(",") === key
      ? estimates
      : [];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => {
          const id = selected[index];
          const item = [...recent, ...estimates].find(
            (estimate) => estimate.id === id,
          );
          return id ? (
            <Card key={index} className="gap-0 py-0 shadow-none">
              <CardContent className="flex items-center gap-2 p-4">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    Property {index + 1}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium">
                    {item?.name ?? `Estimate ${id.slice(0, 8)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove property ${index + 1}`}
                  onClick={() =>
                    setSelected((current) =>
                      current.filter((value) => value !== id),
                    )
                  }
                >
                  <X className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DropdownMenu key={index}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={
                    index !== selected.length ||
                    !recent.some((item) => !selected.includes(item.id))
                  }
                  className="h-[77px] justify-start border-dashed bg-transparent px-5 text-xs text-muted-foreground"
                >
                  <Plus />
                  Add a property
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="max-h-72 w-64 overflow-y-auto"
                align="start"
              >
                {recent
                  .filter((item) => !selected.includes(item.id))
                  .map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() =>
                        setSelected((current) => [...current, item.id])
                      }
                    >
                      <div className="w-full">
                        <p className="text-xs">{item.name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {number(item.features.square_footage)} sq ft ·{" "}
                          {number(item.price)} price units
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
      {error && <ErrorNotice message={error} />}
      {pending ? (
        <div
          role="status"
          aria-label="Loading comparison"
          className="grid gap-5 xl:grid-cols-2"
        >
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : visible.length >= 2 ? (
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">
                Estimated value, side by side
              </CardTitle>
              <CardDescription className="text-xs">
                Saved predictions in source price units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceBars
                data={visible.map((item, index) => ({
                  name: `Property ${index + 1}`,
                  price: item.price,
                }))}
                height={260}
              />
            </CardContent>
          </Card>
          <Card className="gap-0 overflow-hidden shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">
                The details behind the difference
              </CardTitle>
              <CardDescription className="text-xs">
                Inputs and predictions captured when each estimate was created
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead className="min-w-40 pl-6">
                    Property details
                  </TableHead>
                  {visible.map((item) => (
                    <TableHead key={item.id} className="min-w-40 text-right">
                      <span className="block max-w-48 truncate">
                        {item.name}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-primary/[.04]">
                  <TableCell className="pl-6 text-xs font-medium">
                    Estimated price
                  </TableCell>
                  {visible.map((item) => (
                    <TableCell
                      key={item.id}
                      className="text-right text-lg font-semibold text-primary tabular-nums"
                    >
                      {number(item.price)}
                    </TableCell>
                  ))}
                </TableRow>
                {Object.keys(featureLabels).map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="pl-6 text-xs text-muted-foreground">
                      {featureLabels[feature]}
                    </TableCell>
                    {visible.map((item) => (
                      <TableCell
                        key={item.id}
                        className="text-right text-xs tabular-nums"
                      >
                        {featureNumber(
                          feature,
                          item.features[feature as keyof typeof item.features],
                          2,
                        )}
                        {feature === "square_footage" ? " sq ft" : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="pl-6 text-xs text-muted-foreground">
                    Model version
                  </TableCell>
                  {visible.map((item) => (
                    <TableCell
                      key={item.id}
                      className="max-w-48 break-all text-right font-mono text-[9px] text-muted-foreground"
                    >
                      {item.model_version}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </Card>
          {new Set(visible.map((item) => item.model_version)).size > 1 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              These estimates use different model versions. Interpret price
              differences with that in mind.
            </p>
          )}
          {visible.some((item) => item.warnings.length > 0) && (
            <Card className="gap-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Training-range notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {visible
                  .filter((item) => item.warnings.length)
                  .map((item) => (
                    <div key={item.id}>
                      <p className="text-xs font-medium">{item.name}</p>
                      {item.warnings.map((warning) => (
                        <p
                          key={warning}
                          className="mt-1 text-[11px] leading-5 text-muted-foreground"
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        !error && (
          <Card className="shadow-none">
            <EmptyState
              icon={GitCompareArrows}
              title="A better comparison starts with two properties"
              description="Choose two to four saved estimates above, or select properties from your history. The comparison will update automatically."
              action={
                <Button variant="outline" asChild>
                  <Link
                    href={recent.length ? "/estimator/history" : "/estimator"}
                  >
                    {recent.length
                      ? "Browse estimate history"
                      : "Create an estimate"}
                  </Link>
                </Button>
              }
            />
          </Card>
        )
      )}
    </div>
  );
}
