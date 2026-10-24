"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, GitCompareArrows, History } from "lucide-react";
import { cn } from "@/lib/utils";
export function EstimatorNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Estimator views"
      className="mb-6 flex gap-1 overflow-x-auto border-b"
    >
      {[
        { href: "/estimator", label: "New estimate", icon: Calculator },
        { href: "/estimator/history", label: "History", icon: History },
        {
          href: "/estimator/compare",
          label: "Compare",
          icon: GitCompareArrows,
        },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            pathname === item.href && "border-primary text-primary",
          )}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
