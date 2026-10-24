export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function errorMessage(
  body: unknown,
  fallback = "The request could not be completed.",
): string {
  if (!body || typeof body !== "object") return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return (
      detail
        .flatMap((item) =>
          item && typeof item === "object" && typeof item.msg === "string"
            ? [item.msg]
            : [],
        )
        .join(". ") || fallback
    );
  return fallback;
}
export async function api<T>(
  service: "estimator" | "market",
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/${service}/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      errorMessage(
        body,
        `Request failed (${response.status}). Please try again.`,
      ),
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
export function queryString(filters: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value != null && value.trim() !== "" && value !== "all")
      query.set(key, value);
  return query.toString();
}
