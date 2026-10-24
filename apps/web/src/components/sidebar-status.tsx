"use client";

import { useState } from "react";
import { Bug, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DeploymentInfo = { environment: string; version: string };
type BrowserDetails = {
  userAgent: string;
  viewport: string;
  language: string;
  timeZone: string;
  page: string;
};

export function SidebarStatus({ environment, version }: DeploymentInfo) {
  const [details, setDetails] = useState<BrowserDetails | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  function onOpenChange(open: boolean) {
    setCopyStatus("idle");
    if (open) {
      setDetails({
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page: window.location.pathname,
      });
    }
  }

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ environment, version, ...details }, null, 2),
      );
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className="mt-auto pt-5">
      <div className="flex items-center gap-2 border-t px-2 pt-3 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              environment.toLowerCase() === "production"
                ? "bg-emerald-600 dark:bg-emerald-400"
                : "bg-amber-600 dark:bg-amber-400",
            )}
          />
          <span className="truncate font-medium">{environment}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 font-mono text-[10px]">v{version}</span>
        </span>
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Open browser diagnostics"
              title="Browser diagnostics"
            >
              <Bug className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[360px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <PopoverTitle className="text-sm font-semibold">
                  Browser diagnostics
                </PopoverTitle>
                <PopoverDescription className="mt-1 text-xs text-muted-foreground">
                  {environment} · v{version}
                </PopoverDescription>
              </div>
              <PopoverClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Close browser diagnostics"
                >
                  <X className="size-3.5" />
                </Button>
              </PopoverClose>
            </div>
            {details && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium">User agent</p>
                  <p className="select-text break-all rounded-lg bg-muted p-3 font-mono text-[10px] leading-relaxed">
                    {details.userAgent}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                  {[
                    ["Viewport", details.viewport],
                    ["Language", details.language],
                    ["Time zone", details.timeZone],
                    ["Page", details.page],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-all text-right font-mono text-[11px]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={copyDetails}
                >
                  {copyStatus === "copied" ? <Check /> : <Copy />}
                  {copyStatus === "copied" ? "Copied" : "Copy details"}
                </Button>
                <span role="status" className="sr-only">
                  {copyStatus === "copied" && "Browser diagnostics copied to clipboard."}
                </span>
                {copyStatus === "failed" && (
                  <p role="alert" className="text-xs text-destructive">
                    Clipboard unavailable. Select and copy the user-agent text above.
                  </p>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
