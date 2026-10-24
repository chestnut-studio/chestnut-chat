// Same-origin API proxy. On Cloudflare the request goes to the API Worker
// through the `API` service binding. Otherwise, when NUXT_SERVER_URL is set
// (Amp orb portals block cross-origin browser requests, see .amp/services.yaml)
// we forward the API paths to that server. In local dev it falls back to the
// server's default port, so a fresh clone works without apps/web/.env.
// Without any of these, this is a no-op and the app uses
// NUXT_PUBLIC_SERVER_URL as before.
const API_PREFIX = /^\/(api|ai|rpc|api-reference)(\/|$)/;

interface CloudflareApiBinding {
  fetch(request: Request, init?: { redirect?: "manual" | "follow" }): Promise<Response>;
}

export default defineEventHandler((event) => {
  if (!API_PREFIX.test(event.path)) return;

  const binding = (event.context.cloudflare as { env?: { API?: CloudflareApiBinding } } | undefined)
    ?.env?.API;
  // Binding fetches follow redirects by default, which would swallow the
  // OAuth callback's 302 and its Set-Cookie headers; the browser must see them.
  if (binding) return binding.fetch(toWebRequest(event), { redirect: "manual" });

  // Amp portal URLs end with "/" — strip it so paths join correctly.
  const fromEnv = (process.env.NUXT_SERVER_URL ?? "").replace(/\/+$/, "");
  const target = fromEnv || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3010");
  if (!target) return;

  // proxyRequest forwards the incoming headers (including cookies).
  return proxyRequest(event, `${target}${event.path}`);
});
