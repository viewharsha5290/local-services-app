import type { MetadataRoute } from "next";
import { SITE_URL, fetchListings } from "@/lib/site";

// Rebuilt at most once an hour, so a new listing reaches search engines the same day.
export const revalidate = 3600;

/** Every listing, plus the handful of pages that read the same for everyone. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await fetchListings<{ id: string; activity_at: string | null }>("select=id,activity_at&order=activity_at.desc&limit=5000", revalidate);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...["/contact", "/terms", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...listings.map((l) => ({ url: `${SITE_URL}/provider/${l.id}`, lastModified: l.activity_at ?? undefined, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
