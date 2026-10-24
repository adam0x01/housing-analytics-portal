import { NextRequest } from "next/server";
import { apiConfig } from "@/lib/server-api";
export const dynamic = "force-dynamic";
const allowed = {
  estimator: /^(health|model-info|estimates(?:\/(?:compare|[0-9a-f-]{36}))?)$/,
  market: /^(health|market\/(?:overview|what-if|export\.(?:csv|pdf)))$/,
};
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ service: string; path: string[] }> },
) {
  const { service, path } = await context.params;
  const route = path.join("/");
  if (
    (service !== "estimator" && service !== "market") ||
    !allowed[service].test(route)
  )
    return Response.json({ detail: "API route not found." }, { status: 404 });
  try {
    const config = apiConfig();
    const headers: Record<string, string> = {
      Accept: request.headers.get("accept") ?? "application/json",
    };
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 128_000)
      return Response.json(
        { detail: "Request is too large." },
        { status: 413 },
      );
    if (body) headers["Content-Type"] = "application/json";
    const result = await fetch(
      `${config.urls[service].replace(/\/$/, "")}/${route}${request.nextUrl.search}`,
      {
        method: request.method,
        body,
        headers,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(config.timeout),
      },
    );
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["Content-Type", "Content-Disposition"]) {
      const value = result.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name);
    return Response.json(
      {
        detail: timedOut
          ? "The service took too long to respond. Please try again."
          : "Cannot connect to this service. Check that it is running and try again.",
      },
      { status: timedOut ? 504 : 503 },
    );
  }
}
export { proxy as GET, proxy as POST };
