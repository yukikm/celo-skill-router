import { headers } from "next/headers";

/**
 * Build an absolute base URL for server-side fetches.
 *
 * Vercel/edge environments often require absolute URLs, and `localhost`
 * obviously breaks in production.
 */
export async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}
