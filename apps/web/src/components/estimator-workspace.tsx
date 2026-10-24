"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  GitCompareArrows,
  Info,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorNotice } from "@/components/page-parts";
import { PropertyFields } from "@/components/property-fields";
import { PriceBars } from "@/components/charts";
import { useComparison } from "@/components/providers";
import { useApiAction } from "@/hooks/use-api-action";
import { api } from "@/lib/api";
import {
  estimateSchema,
  sampleFeatures,
  type EstimateForm,
} from "@/lib/property-schema";
import type { Estimate, ModelInfo } from "@/lib/types";
import { date, number } from "@/lib/format";

export function EstimatorWorkspace({
  model,
  medianPrice,
}: {
  model: ModelInfo | null;
  medianPrice: number | null;
}) {
  const form = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { name: "", features: sampleFeatures },
  });
  const values = useWatch({ control: form.control });
  const [result, setResult] = useState<Estimate | null>(null);
  const { run, pending, error, clearError } = useApiAction();
  const { ids, toggle } = useComparison();
  const router = useRouter();
  const changed =
    result &&
    JSON.stringify(values.features) !== JSON.stringify(result.features);
  async function submit(data: EstimateForm) {
    setResult(null);
    const estimate = await run((signal) =>
      api<Estimate>("estimator", "estimates", {
        method: "POST",
        body: JSON.stringify(data),
        signal,
      }),
    );
    if (estimate) {
      setResult(estimate);
      toast.success("Estimate saved to your history");
      router.refresh();
    }
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card className="gap-0 shadow-none">
        <CardHeader className="border-b pb-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Property details</CardTitle>
              <CardDescription className="mt-1.5 text-xs">
                Seven inputs. One consistent model.
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="gap-1.5 text-[10px] font-normal"
            >
              <Building2 className="size-3" />
              Residential
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={form.handleSubmit(submit)}
            noValidate
            className="space-y-6"
          >
            <div>
              <Label htmlFor="property-name" className="text-xs">
                Property name{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="property-name"
                placeholder="e.g. Property A"
                maxLength={80}
                className="mt-2 h-10 bg-background/40"
                disabled={pending}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="border-t pt-6">
              <PropertyFields
                register={form.register}
                errors={form.formState.errors}
                disabled={pending}
              />
            </div>
            {error && <ErrorNotice message={error} />}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  form.reset({ name: "", features: sampleFeatures });
                  clearError();
                }}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                Reset sample
              </Button>
              <Button type="submit" disabled={pending} className="min-w-44">
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Calculating…
                  </>
                ) : (
                  <>
                    <Calculator />
                    Calculate estimate
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-5" aria-live="polite" aria-busy={pending}>
        {pending ? (
          <Card className="shadow-none">
            <CardContent className="space-y-6 p-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-52" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-56 w-full" />
              <span className="sr-only">Calculating your estimate.</span>
            </CardContent>
          </Card>
        ) : result ? (
          <Card className="gap-0 overflow-hidden border-primary/25 shadow-none">
            <div className="border-b bg-primary/[.05] p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Estimated property value
                </p>
                <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                  <Check className="size-3" />
                  Saved
                </Badge>
              </div>
              <p className="mt-4 text-[42px] leading-none font-semibold tracking-[-0.04em] tabular-nums text-primary">
                {number(result.price)}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Source price units · currency unspecified
              </p>
              <div className="mt-5 flex items-center gap-2">
                <Building2 className="size-3.5 text-muted-foreground" />
                <h3 className="truncate text-xs font-medium">{result.name}</h3>
              </div>
            </div>
            <CardContent className="pt-5">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                {medianPrice == null
                  ? "Your estimate"
                  : "In context: reference sample median"}
              </p>
              <PriceBars
                data={[
                  { name: "This estimate", price: result.price },
                  ...(medianPrice == null
                    ? []
                    : [{ name: "Sample median", price: medianPrice }]),
                ]}
                height={190}
              />
              <Table className="mt-3 text-xs">
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Estimated price
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {number(result.price, 2)}
                    </TableCell>
                  </TableRow>
                  {medianPrice != null && (
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        Sample median
                      </TableCell>
                      <TableCell className="text-right">
                        {number(medianPrice, 2)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Created
                    </TableCell>
                    <TableCell className="text-right">
                      {date(result.created_at)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {changed && (
                <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
                  Inputs have changed. Calculate again to save a new estimate.
                </p>
              )}
              {result.warnings.length > 0 && (
                <Alert className="mt-4 border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300">
                  <Info className="size-4" />
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4 text-[11px]">
                      {result.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!ids.includes(result.id) && ids.length >= 4}
                  onClick={() => toggle(result.id)}
                  className="text-xs"
                >
                  <GitCompareArrows />
                  {ids.includes(result.id)
                    ? "Remove comparison"
                    : "Add to comparison"}
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/estimator/history">
                    View history <ArrowRight />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 truncate font-mono text-[9px] text-muted-foreground">
                {result.model_version}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="gap-0 overflow-hidden shadow-none">
            <div className="border-b bg-gradient-to-br from-primary/[.06] to-card p-6">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                <Sparkles className="size-5" strokeWidth={1.6} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                The next step to a clearer estimate.
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Enter the property details and calculate an estimate. Your
                result, context chart, and saved record will appear here.
              </p>
            </div>
            <CardContent className="space-y-5 pt-6">
              {[
                {
                  n: "01",
                  title: "Describe the property",
                  text: "Add all seven features. Sample values are provided to get you started.",
                },
                {
                  n: "02",
                  title: "Calculate and review",
                  text: "View the model output with any training-range warnings.",
                },
                {
                  n: "03",
                  title: "Save and compare",
                  text: "Every successful estimate is saved. Compare up to four properties.",
                },
              ].map((item) => (
                <div key={item.n} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[9px] text-muted-foreground">
                    {item.n}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <div className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-medium">Understand the estimate</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {model
                ? `A linear regression baseline trained on ${model.training_rows} supplied properties. Cross-validated MAE: ${number(model.evaluation.regression.mae)} price units.`
                : "A linear regression baseline on the supplied sample. Model details could not be loaded right now."}{" "}
              This is an illustrative model, with no guaranteed market accuracy.
            </p>
            <Link
              href="/model"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary"
            >
              Model details <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
