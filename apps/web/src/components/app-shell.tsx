"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
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
import { SidebarStatus, type DeploymentInfo } from "@/components/sidebar-status";
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
    <nav className="mt-4 space-y-1" aria-label="Main navigation">
      {navigation.map((item, index) => (
        <div key={item.href}>
          {item.group && (
            <p
              className={cn(
                "mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                index > 0 && "mt-5",
              )}
            >
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
export function AppShell({ children, deployment }: {
  children: React.ReactNode;
  deployment: DeploymentInfo;
}) {
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
        <SidebarStatus {...deployment} />
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
                <SidebarStatus {...deployment} />
              </SheetContent>
            </Sheet>
            <span className="hidden text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/60 sm:inline" />
            <span className="font-medium">{page}</span>
          </div>
          <div className="flex items-center gap-4">
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
      </div>
    </div>
  );
}
