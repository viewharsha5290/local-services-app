import type { Metadata } from "next";
import { SITE_NAME, fetchListings } from "@/lib/site";
import { photoUrl } from "@/lib/photos";
import { isRegion } from "@/lib/cities";

interface ListingHead {
  name: string;
  category: string;
  area_note: string | null;
  cities: string[] | null;
  bio: string | null;
  photos: string[] | null;
}

/** Gives each listing its own title, description and preview image, so a link shared in a chat
 * shows the business rather than the site's general blurb. The page itself is drawn in the
 * browser (page.tsx); this only fills in the document head. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  const [listing] = await fetchListings<ListingHead>(`id=eq.${id}&select=name,category,area_note,cities,bio,photos`, 300);
  if (!listing) return {};

  const city = listing.cities?.find((c) => !isRegion(c))?.split(",")[0];
  const where = city ? ` in ${city}` : "";
  const title = `${listing.name} · ${listing.category}${where}`;
  const summary = listing.bio?.trim() || `${listing.name}: ${listing.category.toLowerCase()}${where}. Phone number, photos and neighbours' reviews on ${SITE_NAME}.`;
  const description = summary.length > 200 ? `${summary.slice(0, 197).trimEnd()}…` : summary;
  const image = listing.photos?.[0] ? photoUrl(listing.photos[0]) : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/provider/${id}` },
    openGraph: { title, description, url: `/provider/${id}`, type: "website", siteName: SITE_NAME, images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
