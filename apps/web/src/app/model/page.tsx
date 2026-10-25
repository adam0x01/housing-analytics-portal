import type { Metadata } from "next";
import {
  ArrowUpRight,
  Braces,
  Database,
  Gauge,
  Layers,
  ScanLine,
} from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { ModelInfo } from "@/lib/types";
import { date, featureLabels, featureNumber, number } from "@/lib/format";
import { PageHeading, StatCard } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export const metadata: Metadata = { title: "Model details" };
export const dynamic = "force-dynamic";
export default async function ModelPage() {
  const model = await serverApi<ModelInfo>("estimator", "model-info");
  const docsUrl = process.env.MODEL_DOCS_URL ?? "http://localhost:8000/docs";
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Model transparency"
        title="Understand what sits behind the estimate."
        description="An inspectable regression baseline, with its validation results and limitations in the open."
        action={
          docsUrl ? (
            <Button variant="outline" asChild>
              <a href={docsUrl} target="_blank" rel="noreferrer">
                API documentation <ArrowUpRight />
              </a>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Training properties"
          value={number(model.training_rows)}
          note="Supplied labelled reference sample"
          icon={Database}
        />
        <StatCard
          label="Cross-validated MAE"
          value={number(model.evaluation.regression.mae)}
          note="Mean absolute error · source price units"
          icon={Gauge}
        />
        <StatCard
          label="Cross-validated RMSE"
          value={number(model.evaluation.regression.rmse)}
          note="Larger errors receive more weight"
          icon={ScanLine}
        />
        <StatCard
          label="Cross-validated R²"
          value={number(model.evaluation.regression.r2, 4)}
          note="Coefficient of determination, not accuracy %"
          icon={Layers}
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="gap-0 overflow-hidden shadow-none">
          <CardHeader>
            <CardTitle className="text-sm">Model coefficients</CardTitle>
            <CardDescription className="text-xs">
              Raw input units · ordinary least-squares regression
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="pl-6">Feature</TableHead>
                <TableHead className="text-right">Coefficient</TableHead>
                <TableHead className="pr-6 text-right">
                  Observed range
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.feature_names.map((name) => (
                <TableRow key={name}>
                  <TableCell className="pl-6 text-xs">
                    {featureLabels[name] ?? name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {number(model.coefficients[name], 2)}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                    {featureNumber(name, model.feature_ranges[name].minimum, 1)}{" "}
                    –{" "}
                    {featureNumber(name, model.feature_ranges[name].maximum, 1)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="pl-6 text-xs font-medium">
                  Intercept
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {number(model.intercept, 2)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          <CardContent className="pt-5">
            <p className="text-[11px] leading-6 text-muted-foreground">
              Coefficients describe fitted partial associations. Strong
              correlation between features can make individual signs unstable.
              They do not establish causal effects.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Braces className="size-4 text-primary" />
                Evaluation method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs leading-6 text-muted-foreground">
                {model.evaluation.method}. Each property is evaluated by a model
                trained without that property. The serving model is subsequently
                refitted on all labelled rows.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {model.evaluation.folds} folds
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Seed {model.evaluation.seed}
                </Badge>
              </div>
              <div className="border-t pt-4">
                <p className="text-[11px] font-medium">
                  Mean-price baseline MAE
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {number(model.evaluation.baseline.mae)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Compared using the same held-out folds
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Version & provenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Model version
                </p>
                <p className="mt-1 break-all font-mono text-[10px]">
                  {model.model_version}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Trained (HKT)
                </p>
                <p className="mt-1 text-xs">{date(model.trained_at)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Dataset SHA-256
                </p>
                <p className="mt-1 break-all font-mono text-[9px] leading-5">
                  {model.dataset_sha256}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card className="gap-0 bg-secondary/30 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm">
            What this model cannot tell you
          </CardTitle>
          <CardDescription className="text-xs">
            Read the result with its context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {model.limitations.map((limitation) => (
              <li
                key={limitation}
                className="flex gap-2 text-[11px] leading-6 text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                {limitation}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
