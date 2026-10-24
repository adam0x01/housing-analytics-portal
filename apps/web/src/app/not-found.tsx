import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-parts";
export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This page may have moved. Head back to your workspace."
      action={
        <Button asChild>
          <Link href="/">Go to overview</Link>
        </Button>
      }
    />
  );
}
