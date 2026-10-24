import { AlertCircle, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-semibold tracking-[0.15em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[27px] leading-tight font-semibold tracking-[-0.035em] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="rounded-md bg-secondary p-1.5 text-muted-foreground">
            <Icon className="size-4" strokeWidth={1.7} />
          </span>
        </div>
        <p className="text-[28px] font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
export function ErrorNotice({
  message,
  title = "Unable to complete this request",
}: {
  message: string;
  title?: string;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
export function EmptyState({
  icon: Icon = ArrowUpRight,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-secondary/60 text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-7">
      <span className="sr-only">Loading, please wait.</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-60 rounded-xl" />
    </div>
  );
}
