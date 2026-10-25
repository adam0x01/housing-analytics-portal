"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building2,
  Info,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { estimateSchema, type EstimateForm } from "@/lib/property-schema";
import type { Property, PropertyFeatures, WhatIfResult } from "@/lib/types";
import { featureLabels, featureNumber, number } from "@/lib/format";
import { useApiAction } from "@/hooks/use-api-action";
import { PropertyFields } from "@/components/property-fields";
import { PriceBars } from "@/components/charts";
import { ErrorNotice } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Exclude dataset-only fields (id and observed price) from model requests.
function features(property: Property): PropertyFeatures {
  return {
    square_footage: property.square_footage,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    year_built: property.year_built,
    lot_size: property.lot_size,
    distance_to_city_center: property.distance_to_city_center,
    school_rating: property.school_rating,
  };
}

/** Evaluates reference/scenario together without persisting a new estimate. */
export function WhatIfWorkspace({
  properties,
  initialProperty,
}: {
  properties: Property[];
  initialProperty: number;
}) {
  const [referenceId, setReferenceId] = useState(initialProperty);
  const reference =
    properties.find((property) => property.id === referenceId) ?? properties[0];

  const form = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { name: "Scenario", features: features(reference) },
  });
  const values = useWatch({ control: form.control });

  const [result, setResult] = useState<WhatIfResult | null>(null);

  // Retain the submitted snapshot so edits can mark a displayed result as stale.
  const [submitted, setSubmitted] = useState<PropertyFeatures | null>(null);
  const { run, pending, error, clearError } = useApiAction();

  const changed =
    result && JSON.stringify(values.features) !== JSON.stringify(submitted);

  function selectReference(value: string) {
    const property = properties.find((item) => item.id === Number(value));

    if (!property) return;

    setReferenceId(property.id);
    form.reset({ name: "Scenario", features: features(property) });
    setResult(null);
    clearError();
  }

  async function submit(data: EstimateForm) {
    setResult(null);
    const response = await run((signal) =>
      api<WhatIfResult>("market", "market/what-if", {
        method: "POST",
        body: JSON.stringify({
          baseline: features(reference),
          scenario: data.features,
        }),
        signal,
      }),
    );

    if (response) {
      setResult(response);
      setSubmitted(data.features);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <Label htmlFor="reference-property" className="text-xs">
                Start with a reference property
              </Label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Choose a supplied property, then adjust the scenario features
                below.
              </p>
            </div>
          </div>
          <Select
            value={String(reference.id)}
            onValueChange={selectReference}
            disabled={pending}
          >
            <SelectTrigger
              id="reference-property"
              className="w-full bg-background/40 text-xs sm:w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {properties.map((property) => (
                <SelectItem key={property.id} value={String(property.id)}>
                  Property {String(property.id).padStart(3, "0")} ·{" "}
                  {number(property.square_footage)} sq ft · {property.bedrooms}{" "}
                  beds
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="gap-0 shadow-none">
          <CardHeader className="border-b pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Build your scenario</CardTitle>
                <CardDescription className="mt-1.5 text-xs">
                  Change one feature or explore a completely different property.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal">
                What-if analysis
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              noValidate
              onSubmit={form.handleSubmit(submit)}
              className="space-y-5"
            >
              <PropertyFields
                register={form.register}
                errors={form.formState.errors}
                disabled={pending}
                prefix="scenario"
              />
              {error && <ErrorNotice message={error} />}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    form.reset({
                      name: "Scenario",
                      features: features(reference),
                    });
                    clearError();
                  }}
                  className="text-xs"
                >
                  <RotateCcw />
                  Reset scenario
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Evaluating…
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal />
                      Run scenario
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-5" aria-live="polite" aria-busy={pending}>
          {pending ? (
            <Card>
              <CardContent className="space-y-5 pt-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-12 w-56" />
                <Skeleton className="h-56 w-full" />
                <span className="sr-only">
                  Calculating reference and scenario predictions.
                </span>
              </CardContent>
            </Card>
          ) : result ? (
            <Card className="gap-0 border-primary/25 shadow-none">
              <CardHeader className="border-b bg-primary/[.04]">
                <CardTitle className="text-sm">Scenario result</CardTitle>
                <CardDescription className="text-xs">
                  Both properties evaluated by the same model
                </CardDescription>
                <div className="mt-4 flex items-end gap-3">
                  <p className="text-[36px] leading-none font-semibold tracking-tight text-primary tabular-nums">
                    {number(result.scenario.price)}
                  </p>
                  <Badge variant="secondary" className="mb-0.5 text-[10px]">
                    {result.change_percent == null
                      ? "Percentage unavailable"
                      : `${result.change >= 0 ? "+" : ""}${number(result.change_percent, 1)}% vs reference`}
                  </Badge>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Source price units · scenario estimate
                </p>
              </CardHeader>
              <CardContent className="pt-5">
                <PriceBars
                  data={[
                    { name: "Reference", price: result.baseline.price },
                    { name: "Scenario", price: result.scenario.price },
                  ]}
                  height={190}
                />
                <Table className="mt-2 text-xs">
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        Reference prediction
                      </TableCell>
                      <TableCell className="text-right">
                        {number(result.baseline.price, 2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        Scenario prediction
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {number(result.scenario.price, 2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        Difference
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {result.change >= 0 ? "+" : ""}
                        {number(result.change, 2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {changed && (
                  <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
                    Inputs have changed. Run the scenario again to update these
                    results.
                  </p>
                )}
                {[
                  ...new Set([
                    ...result.baseline.warnings,
                    ...result.scenario.warnings,
                  ]),
                ].map((warning) => (
                  <p
                    key={warning}
                    className="mt-3 text-[11px] leading-5 text-amber-700 dark:text-amber-400"
                  >
                    {warning}
                  </p>
                ))}
                <p className="mt-4 break-all font-mono text-[9px] text-muted-foreground">
                  {result.model_version}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="gap-0 shadow-none">
              <CardHeader>
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SlidersHorizontal className="size-5" />
                </div>
                <CardTitle className="text-lg tracking-tight">
                  What could be different?
                </CardTitle>
                <CardDescription className="mt-2 text-xs leading-6">
                  Adjust the property features and compare a new scenario
                  against the model&apos;s prediction for your reference
                  property.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border bg-secondary/35 p-4 text-xs">
                  <span className="text-muted-foreground">
                    Reference property
                  </span>
                  <ArrowRight className="size-4 text-primary" />
                  <span className="font-medium">Your scenario</span>
                </div>
                <p className="mt-4 text-[11px] leading-6 text-muted-foreground">
                  Both predictions are calculated together. The reference
                  prediction is a model estimate, rather than the observed sale
                  price.
                </p>
              </CardContent>
            </Card>
          )}
          <Card className="gap-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">
                Reference · Property {String(reference.id).padStart(3, "0")}
              </CardTitle>
              <CardDescription className="text-xs">
                Observed source price: {number(reference.price)} units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                {Object.entries(features(reference)).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] text-muted-foreground">
                      {featureLabels[key]}
                    </dt>
                    <dd className="mt-1 text-xs font-medium tabular-nums">
                      {featureNumber(key, value)}
                      {key === "square_footage" ? " sq ft" : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <p className="flex gap-2 px-1 text-[10px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />A what-if scenario
            illustrates the fitted model. Changing one feature is not evidence
            of a causal change in market value.
          </p>
        </div>
      </div>
    </div>
  );
}
