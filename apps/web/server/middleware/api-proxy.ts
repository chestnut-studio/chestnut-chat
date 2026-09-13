// Same-origin API proxy. Amp orb portals block cross-origin browser requests,
// so when NUXT_SERVER_URL is set the browser talks to this origin and we
// forward the API paths to the server (see .amp/services.yaml). In local dev
// it falls back to the server's default port, so a fresh clone works without
// apps/web/.env. Without either, this is a no-op and the app uses
// NUXT_PUBLIC_SERVER_URL as before.
const API_PREFIX = /^\/(api|ai|rpc|api-reference)(\/|$)/;

export default defineEventHandler((event) => {
  // Amp portal URLs end with "/" — strip it so paths join correctly.
  const fromEnv = (process.env.NUXT_SERVER_URL ?? "").replace(/\/+$/, "");
  const target = fromEnv || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3010");
  if (!target || !API_PREFIX.test(event.path)) return;

  // proxyRequest forwards the incoming headers (including cookies).
  return proxyRequest(event, `${target}${event.path}`);
});
