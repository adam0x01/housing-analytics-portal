"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  Calculator,
  ChevronRight,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  ScanLine,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useComparison } from "@/components/providers";
import { cn } from "@/lib/utils";
const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard, group: "Workspace" },
  {
    label: "Value estimator",
    href: "/estimator",
    icon: Calculator,
    group: "Property estimator",
  },
  { label: "Estimate history", href: "/estimator/history", icon: History },
  {
    label: "Compare properties",
    href: "/estimator/compare",
    icon: GitCompareArrows,
  },
  {
    label: "Market dashboard",
    href: "/market",
    icon: BarChart3,
    group: "Market analysis",
  },
  { label: "What-if studio", href: "/market/what-if", icon: SlidersHorizontal },
  {
    label: "Model details",
    href: "/model",
    icon: ScanLine,
    group: "Resources",
  },
];
function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 px-3 py-1">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Building2 className="size-5" strokeWidth={1.8} />
      </span>
      <span>
        <span className="block text-[17px] font-semibold tracking-tight">
          Housing<span className="text-primary">.</span>
        </span>
        <span className="block text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Analytics portal
        </span>
      </span>
    </Link>
  );
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { ids } = useComparison();
  return (
    <nav className="mt-9 space-y-1" aria-label="Main navigation">
      {navigation.map((item) => (
        <div key={item.href}>
          {item.group && (
            <p className="mb-2 mt-6 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.group}
            </p>
          )}
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              pathname === item.href &&
                "bg-primary/10 text-primary dark:bg-primary/15",
            )}
          >
            <item.icon className="size-[17px]" strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/estimator/compare" && ids.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 justify-center px-1 text-[10px]"
              >
                {ids.length}
              </Badge>
            )}
          </Link>
        </div>
      ))}
    </nav>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const page =
    navigation.find((item) => item.href === pathname)?.label ?? "Workspace";
  const { setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[238px] flex-col border-r bg-sidebar p-4 lg:flex">
        <div className="pt-3">
          <Brand />
        </div>
        <Navigation />
        <div className="mt-auto rounded-xl border bg-background/50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="size-2 rounded-full bg-primary/65" />
            Reference workspace
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Explore property values with a consistent view of your data.
          </p>
          <Link
            href="/model"
            className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            About the model <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-2.5 px-2 py-1 text-[11px] text-muted-foreground">
          <Monitor className="size-4" />
          Housing Analytics
          <span className="ml-auto font-mono text-[10px]">v1.0</span>
        </div>
      </aside>
      <div className="lg:pl-[238px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b bg-card/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-2 text-xs">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-1 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-5">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <Navigation onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="hidden text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/60 sm:inline" />
            <span className="font-medium">{page}</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              className="hidden gap-1.5 rounded-full py-1 font-normal text-muted-foreground sm:flex"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Reference dataset
            </Badge>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Change appearance"
                >
                  <Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1536px] p-4 pb-12 sm:p-7 lg:p-9"
        >
          {children}
        </main>
        <footer className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t px-1 py-5 text-[10px] text-muted-foreground sm:mx-7 lg:mx-9">
          <span>Housing Analytics · Property insights, clearly presented.</span>
          <span>Sample data · Price units as supplied</span>
        </footer>
      </div>
    </div>
  );
}
