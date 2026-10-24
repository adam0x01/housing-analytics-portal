import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import type { MarketOverview, ModelInfo } from "@/lib/types";
import { PageHeading } from "@/components/page-parts";
import { EstimatorNavigation } from "@/components/estimator-navigation";
import { EstimatorWorkspace } from "@/components/estimator-workspace";
export const metadata: Metadata = { title: "Property value estimator" };
export const dynamic = "force-dynamic";
export default async function EstimatorPage() {
  const [model, market] = await Promise.allSettled([
    serverApi<ModelInfo>("estimator", "model-info"),
    serverApi<MarketOverview>("market", "market/overview"),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Property estimator"
        title="Put a value on the details."
        description="Explore an estimated property value using the features that shape the model."
      />
      <EstimatorNavigation />
      <EstimatorWorkspace
        model={model.status === "fulfilled" ? model.value : null}
        medianPrice={
          market.status === "fulfilled"
            ? market.value.summary.median_price
            : null
        }
      />
    </>
  );
}
