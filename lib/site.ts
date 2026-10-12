/** Facts about the site that page titles, link previews, the sitemap and robots.txt share. */
export const SITE_URL = "https://www.thelocalservices.ca";
export const SITE_NAME = "The Local Services";
export const SITE_TAGLINE = "Local businesses your neighbours recommend";
export const SITE_DESCRIPTION =
  "A free directory of local businesses in Hamilton and across Ontario, built on neighbours' recommendations: cakes, tailors, mechanics, priests, renovators and more.";

/** One listing as the server reads it for a title or the sitemap. Listings are public, so this
 * uses the same public key the browser does; `fields` is a PostgREST select list. */
export async function fetchListings<T>(query: string, revalidateSeconds: number): Promise<T[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return [];
  try {
    const res = await fetch(`${base}/rest/v1/providers?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: revalidateSeconds } });
    return res.ok ? ((await res.json()) as T[]) : [];
  } catch {
    // a page still renders with the site-wide title if the database can't be reached
    return [];
  }
}
