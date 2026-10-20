import type { MetadataRoute } from "next";
import { SITE_URL, fetchListings } from "@/lib/site";

// Rebuilt at most once an hour, so a new listing reaches search engines the same day.
export const revalidate = 3600;

/** Every listing, plus the handful of pages that read the same for everyone. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // read in pages: the database hands back at most 1,000 rows a request
  const listings: { id: string; activity_at: string | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fetchListings<{ id: string; activity_at: string | null }>(`select=id,activity_at&order=activity_at.desc,id&limit=1000&offset=${offset}`, revalidate);
    listings.push(...page);
    if (page.length < 1000) break;
  }
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...["/contact", "/terms", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...listings.map((l) => ({ url: `${SITE_URL}/provider/${l.id}`, lastModified: l.activity_at ?? undefined, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
