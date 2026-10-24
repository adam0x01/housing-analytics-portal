"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpDown,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Filter,
  Loader2,
  RotateCcw,
  Ruler,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, queryString } from "@/lib/api";
import type { MarketFilters, MarketOverview, Property } from "@/lib/types";
import { featureNumber, number } from "@/lib/format";
import { useApiAction } from "@/hooks/use-api-action";
import {
  AreaPriceChart,
  DistributionChart,
  PriceBars,
} from "@/components/charts";
import { EmptyState, ErrorNotice, StatCard } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MarketWorkspace({ initial }: { initial: MarketOverview }) {
  const [market, setMarket] = useState(initial);
  const [draft, setDraft] = useState<MarketFilters>({});
  const [applied, setApplied] = useState<MarketFilters>({});
  const [validation, setValidation] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: keyof Property; direction: 1 | -1 }>({
    key: "id",
    direction: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const { run, pending, error } = useApiAction();
  const rows = useMemo(
    () =>
      market.properties
        .filter((property) =>
          `property ${String(property.id).padStart(3, "0")}`.includes(
            search.toLowerCase().trim(),
          ),
        )
        .sort((a, b) => (a[sort.key] - b[sort.key]) * sort.direction),
    [market.properties, search, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  async function apply(filters: MarketFilters) {
    setValidation(null);
    if (
      Object.values(filters).some(
        (value) =>
          value != null &&
          value !== "" &&
          value !== "all" &&
          (!Number.isFinite(Number(value)) || Number(value) < 0),
      )
    ) {
      setValidation("Filter values must be valid non-negative numbers.");
      return;
    }
    if (
      (filters.minPrice &&
        filters.maxPrice &&
        Number(filters.minPrice) > Number(filters.maxPrice)) ||
      (filters.minArea &&
        filters.maxArea &&
        Number(filters.minArea) > Number(filters.maxArea))
    ) {
      setValidation("Minimum values must not exceed maximum values.");
      return;
    }
    const result = await run((signal) =>
      api<MarketOverview>("market", `market/overview?${queryString(filters)}`, {
        signal,
      }),
    );
    if (result) {
      setMarket(result);
      setApplied(filters);
      setPage(1);
    }
  }
  async function download(format: "csv" | "pdf") {
    setExporting(format);
    setExportError(null);
    try {
      const response = await fetch(
        `/api/market/market/export.${format}?${queryString(applied)}`,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok)
        throw new Error(
          errorMessage(
            await response.json().catch(() => null),
            "The export could not be generated. Please try again.",
          ),
        );
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `housing-market.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (failure) {
      setExportError(
        failure instanceof Error ? failure.message : "Export failed.",
      );
    } finally {
      setExporting(null);
    }
  }
  const columns: { key: keyof Property; label: string }[] = [
    { key: "id", label: "Property" },
    { key: "square_footage", label: "Floor area" },
    { key: "bedrooms", label: "Beds" },
    { key: "bathrooms", label: "Baths" },
    { key: "year_built", label: "Built" },
    { key: "school_rating", label: "School rating" },
    { key: "distance_to_city_center", label: "Distance" },
    { key: "price", label: "Observed price" },
  ];
  return (
    <div className="space-y-6">
      <Card className="gap-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <CardTitle className="text-sm">
              Find your property segment
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {market.summary.property_count} of {market.summary.dataset_count}{" "}
            properties
          </Badge>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void apply(draft);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <Label htmlFor="filter-bedrooms" className="text-[11px]">
                  Bedrooms
                </Label>
                <Select
                  value={draft.bedrooms ?? "all"}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, bedrooms: value }))
                  }
                >
                  <SelectTrigger
                    id="filter-bedrooms"
                    className="mt-2 w-full bg-background/40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bedroom counts</SelectItem>
                    {[2, 3, 4].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count} bedrooms
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {[
                {
                  key: "minPrice",
                  label: "Minimum price",
                  placeholder: "No minimum",
                },
                {
                  key: "maxPrice",
                  label: "Maximum price",
                  placeholder: "No maximum",
                },
                {
                  key: "minArea",
                  label: "Minimum floor area (sq ft)",
                  placeholder: "No minimum",
                },
                {
                  key: "maxArea",
                  label: "Maximum floor area (sq ft)",
                  placeholder: "No maximum",
                },
                {
                  key: "minSchoolRating",
                  label: "Minimum school rating",
                  placeholder: "Any rating",
                },
              ].map((field) => (
                <div key={field.key}>
                  <Label
                    htmlFor={`filter-${field.key}`}
                    className="text-[11px]"
                  >
                    {field.label}
                  </Label>
                  <Input
                    id={`filter-${field.key}`}
                    type="number"
                    min={0}
                    step="any"
                    placeholder={field.placeholder}
                    value={draft[field.key as keyof MarketFilters] ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="mt-2 bg-background/40 text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">
                Prices and distance use source dataset units.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setDraft({});
                    void apply({});
                  }}
                  className="text-xs"
                >
                  <RotateCcw />
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending}
                  className="min-w-28 text-xs"
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Filter />}
                  Apply filters
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {(validation || error || exportError) && (
        <ErrorNotice message={validation || error || exportError || ""} />
      )}
      {pending ? (
        <div
          role="status"
          aria-label="Updating market analysis"
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Matching properties"
              value={number(market.summary.property_count)}
              note={`From ${market.summary.dataset_count} reference records`}
              icon={Building2}
            />
            <StatCard
              label="Median price"
              value={number(market.summary.median_price)}
              note="Middle price in the selected segment"
              icon={BarChart3}
            />
            <StatCard
              label="Average price"
              value={number(market.summary.mean_price)}
              note="Mean observed price · source units"
              icon={ArrowDownToLine}
            />
            <StatCard
              label="Average floor area"
              value={
                market.summary.average_area == null
                  ? "—"
                  : `${number(market.summary.average_area)} sq ft`
              }
              note="Interior floor area in this segment"
              icon={Ruler}
            />
          </div>
          {market.summary.property_count > 0 ? (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <Card className="min-w-0 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm">Space and value</CardTitle>
                    <CardDescription className="text-xs">
                      Floor area versus observed price · grouped by bedrooms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AreaPriceChart properties={market.properties} />
                    <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                      {market.segments.map((segment, index) => (
                        <span
                          key={segment.bedrooms}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: `var(--chart-${index + 1})`,
                            }}
                          />
                          {segment.label}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-w-0 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Price distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Property count in fixed reference price bands
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DistributionChart data={market.distribution} />
                    <p className="mt-3 text-center text-[10px] text-muted-foreground">
                      Price bands in source units
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
                <Card className="min-w-0 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Median price by bedroom count
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Compare the selected property segments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceBars
                      data={market.segments.map((segment) => ({
                        name: `${segment.bedrooms} beds`,
                        price: segment.median_price,
                      }))}
                      height={210}
                    />
                  </CardContent>
                </Card>
                <Card className="gap-0 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm">Segment breakdown</CardTitle>
                    <CardDescription className="text-xs">
                      A consistent view of the active filters
                    </CardDescription>
                  </CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40">
                        <TableHead className="pl-6">Segment</TableHead>
                        <TableHead className="text-right">Properties</TableHead>
                        <TableHead className="text-right">Mean price</TableHead>
                        <TableHead className="pr-6 text-right">
                          Median price
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {market.segments.map((segment) => (
                        <TableRow key={segment.bedrooms}>
                          <TableCell className="pl-6 text-xs">
                            {segment.label}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {segment.count}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {number(segment.mean_price)}
                          </TableCell>
                          <TableCell className="pr-6 text-right text-xs font-medium tabular-nums">
                            {number(segment.median_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <CardContent className="pt-6">
                    <p className="text-[11px] leading-6 text-muted-foreground">
                      This cross-sectional sample shows relationships within the
                      supplied data. It does not represent changes over time or
                      a broader local market.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="shadow-none">
              <EmptyState
                icon={Filter}
                title="No properties in this segment"
                description="Try a wider price or floor-area range, or reset your filters to explore the complete sample."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft({});
                      void apply({});
                    }}
                  >
                    Reset filters
                  </Button>
                }
              />
            </Card>
          )}
          <Card className="gap-0 overflow-hidden shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b pb-5">
              <div>
                <CardTitle className="text-sm">Reference properties</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Sort the table or take a property into the what-if studio.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    aria-label="Find property in table"
                    placeholder="Find property ID…"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-44 pl-9 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!exporting}
                  onClick={() => download("csv")}
                  className="text-xs"
                >
                  {exporting === "csv" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ArrowDownToLine />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!exporting}
                  onClick={() => download("pdf")}
                  className="text-xs"
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <FileDown />
                  )}
                  PDF
                </Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/35">
                  {columns.map((column, index) => (
                    <TableHead
                      key={column.key}
                      aria-sort={
                        sort.key === column.key
                          ? sort.direction === 1
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={index === 0 ? "pl-5" : "text-right"}
                    >
                      <button
                        aria-label={`Sort by ${column.label}`}
                        onClick={() =>
                          setSort((current) => ({
                            key: column.key,
                            direction:
                              current.key === column.key &&
                              current.direction === 1
                                ? -1
                                : 1,
                          }))
                        }
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px]"
                      >
                        {column.label}
                        <ArrowUpDown className="size-3 opacity-60" />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>
                    <span className="sr-only">What-if analysis</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-2.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span className="whitespace-nowrap text-xs font-medium">
                          Property {String(property.id).padStart(3, "0")}
                        </span>
                      </span>
                    </TableCell>
                    {columns.slice(1).map((column) => (
                      <TableCell
                        key={column.key}
                        className={`text-right text-xs tabular-nums ${column.key === "price" ? "font-semibold" : "text-muted-foreground"}`}
                      >
                        {featureNumber(
                          column.key,
                          property[column.key],
                          column.key === "bathrooms" ||
                            column.key === "school_rating" ||
                            column.key === "distance_to_city_center"
                            ? 1
                            : 0,
                        )}
                        {column.key === "square_footage" && (
                          <span className="ml-1 text-[9px]">sq ft</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="pr-5">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/market/what-if?property=${property.id}`}
                          aria-label={`Explore Property ${property.id} in what-if studio`}
                        >
                          <SlidersHorizontal className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-xs text-muted-foreground"
                    >
                      No property IDs match your table search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
              <p className="text-[11px] text-muted-foreground">
                {rows.length
                  ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, rows.length)}`
                  : "0"}{" "}
                of {rows.length} matching rows
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Rows per page"
                    className="h-8 text-[11px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous property page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft />
                </Button>
                <span className="px-1 text-[11px] text-muted-foreground">
                  {currentPage} / {pages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next property page"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </Card>
          <p className="px-1 text-[10px] text-muted-foreground">
            Exports include all properties matching the segment filters. Table
            search and sorting affect the table view only.
          </p>
        </>
      )}
    </div>
  );
}
