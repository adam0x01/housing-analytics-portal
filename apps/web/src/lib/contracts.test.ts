import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  estimateSchema,
  featuresSchema,
  sampleFeatures,
} from "./property-schema";
import { errorMessage, queryString } from "./api";
import { apiConfig } from "./server-api";
import { featureNumber } from "./format";
import { GET, POST } from "@/app/api/[service]/[...path]/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("property contract", () => {
  it("accepts all supplied features, fractional bathrooms, and an optional name", () => {
    expect(
      estimateSchema.parse({
        name: "  My home  ",
        features: { ...sampleFeatures, bathrooms: 2.5 },
      }).name,
    ).toBe("My home");
    expect(
      featuresSchema.safeParse({ ...sampleFeatures, bedrooms: 0 }).success,
    ).toBe(true);
  });
  it.each([
    { ...sampleFeatures, square_footage: 0 },
    { ...sampleFeatures, bathrooms: -1 },
    { ...sampleFeatures, bedrooms: 2.5 },
    { ...sampleFeatures, school_rating: Infinity },
    { ...sampleFeatures, year_built: 10000 },
  ])("rejects invalid model features", (features) => {
    expect(featuresSchema.safeParse(features).success).toBe(false);
  });
});
describe("API configuration and error presentation", () => {
  it("renders calendar years without numeric grouping", () => {
    expect(featureNumber("year_built", 2001)).toBe("2001");
    expect(featureNumber("lot_size", 6800)).toBe("6,800");
  });
  it("keeps zero-valued filters and omits empty filters", () => {
    expect(
      queryString({
        bedrooms: "all",
        minPrice: "0",
        maxPrice: "",
        minArea: undefined,
      }),
    ).toBe("minPrice=0");
  });
  it("renders upstream validation messages", () => {
    expect(
      errorMessage({ detail: [{ msg: "Bedrooms must be an integer" }] }),
    ).toBe("Bedrooms must be an integer");
  });
  it("validates configurable server URLs", () => {
    vi.stubEnv("ESTIMATOR_API_URL", "file:///etc/passwd");
    expect(apiConfig).toThrow();
  });
  it("validates the timeout", () => {
    vi.stubEnv("API_TIMEOUT_MS", "0");
    expect(apiConfig).toThrow();
  });
});
describe("same-origin backend routes", () => {
  it("forwards requests to the configured estimator URL", async () => {
    vi.stubEnv("ESTIMATOR_API_URL", "http://estimator.internal:9001/custom");
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "saved" }, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(
      new NextRequest("http://localhost/api/estimator/estimates", {
        method: "POST",
        body: JSON.stringify({ features: sampleFeatures }),
        headers: { "Content-Type": "application/json" },
      }),
      {
        params: Promise.resolve({ service: "estimator", path: ["estimates"] }),
      },
    );
    expect(response.status).toBe(201);
    expect(fetch.mock.calls[0][0]).toBe(
      "http://estimator.internal:9001/custom/estimates",
    );
  });
  it("rejects arbitrary upstream paths without fetching", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await GET(
      new NextRequest("http://localhost/api/market/private"),
      { params: Promise.resolve({ service: "market", path: ["private"] }) },
    );
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves export headers and active filters", async () => {
    vi.stubEnv("MARKET_API_URL", "http://market.internal:8002");
    const fetch = vi.fn().mockResolvedValue(
      new Response("%PDF-demo", {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=market.pdf",
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await GET(
      new NextRequest(
        "http://localhost/api/market/market/export.pdf?bedrooms=3",
      ),
      {
        params: Promise.resolve({
          service: "market",
          path: ["market", "export.pdf"],
        }),
      },
    );
    expect(fetch.mock.calls[0][0]).toBe(
      "http://market.internal:8002/market/export.pdf?bedrooms=3",
    );
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("market.pdf");
  });
  it("returns a retryable timeout response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/market/health"),
      { params: Promise.resolve({ service: "market", path: ["health"] }) },
    );
    expect(response.status).toBe(504);
  });
});
