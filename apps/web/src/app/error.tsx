"use client";
import { RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeading } from "@/components/page-parts";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <>
      <PageHeading
        title="Your workspace is temporarily unavailable"
        description="A service could not return the data needed for this page."
      />
      <Card>
        <EmptyState
          icon={ServerCrash}
          title="Let's try that again"
          description="Check that the application services are running. Your saved estimates remain in history."
          action={
            <Button onClick={retry}>
              <RefreshCw />
              Retry loading
            </Button>
          }
        />
      </Card>
    </>
  );
}
