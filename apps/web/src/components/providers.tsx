"use client";
import { createContext, useContext, useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
const ComparisonContext = createContext<{
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
}>({ ids: [], toggle: () => {}, clear: () => {} });
export function useComparison() {
  return useContext(ComparisonContext);
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  function toggle(id: string) {
    setIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  }
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <ComparisonContext.Provider
          value={{ ids, toggle, clear: () => setIds([]) }}
        >
          {children}
          <Toaster richColors position="bottom-right" />
        </ComparisonContext.Provider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
