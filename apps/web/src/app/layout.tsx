import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Housing Analytics", template: "%s | Housing Analytics" },
  description:
    "Property value estimation, comparison, and market analysis in one workspace.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell
            deployment={{
              environment: process.env.APP_ENVIRONMENT?.trim() || "Testing",
              version: process.env.APP_VERSION?.trim().replace(/^v/i, "") || "2.1",
            }}
          >
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
