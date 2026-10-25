import { ApiError, errorMessage } from "./api";

/** Read runtime configuration so one web image can serve local and cloud deployments. */
export function apiConfig() {
  const timeout = Number(process.env.API_TIMEOUT_MS ?? 15000);

  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 120000)
    throw new Error("API_TIMEOUT_MS must be between 1 and 120000.");

  const urls = {
    estimator: process.env.ESTIMATOR_API_URL ?? "http://127.0.0.1:8001",
    market: process.env.MARKET_API_URL ?? "http://127.0.0.1:8002",
  };

  for (const value of Object.values(urls)) {
    const parsed = new URL(value);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error(
        "Configure a valid HTTP(S) API URL without credentials, query, or fragment.",
      );
  }

  return { urls, timeout };
}

/** Server Components call application APIs directly, without an extra BFF hop. */
export async function serverApi<T>(
  service: "estimator" | "market",
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const config = apiConfig();
  const response = await fetch(
    `${config.urls[service].replace(/\/$/, "")}/${path}`,
    {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeout),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      errorMessage(
        body,
        `${service === "market" ? "Market analysis" : "Estimation"} is temporarily unavailable.`,
      ),
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
