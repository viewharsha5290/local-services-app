import { fetchListings } from "@/lib/site";

/** A listing that came from Google Maps and has no photo of its own borrows Google's first photo
 * of the place for its listing page. Nothing is copied: this asks Google for a short-lived address
 * of the picture each time, and the visitor's browser loads it straight from Google, shown with
 * the photographer's credit as Google requires.
 *
 * Needs GOOGLE_PLACES_API_KEY in the hosting environment. Without it, or for a listing that has
 * its own photos or no Google place, the answer is empty and the page keeps its illustration. */

// Each photo address is billed by Google, so one is reused for a few minutes rather than
// requested again on every view of the same listing.
const REUSE_SECONDS = 600;
const PLACES = "https://places.googleapis.com/v1";

interface GooglePhoto {
  name: string;
  authorAttributions?: { displayName?: string; uri?: string }[];
}

const nothing = () => new Response(null, { status: 204 });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !/^[0-9a-f-]{36}$/i.test(id)) return nothing();

  const [listing] = await fetchListings<{ google_place_id: string | null; photos: string[] | null }>(`id=eq.${id}&select=google_place_id,photos`, REUSE_SECONDS);
  if (!listing?.google_place_id || listing.photos?.length) return nothing();

  try {
    const headers = { "X-Goog-Api-Key": key };
    const details = await fetch(`${PLACES}/places/${encodeURIComponent(listing.google_place_id)}`, {
      headers: { ...headers, "X-Goog-FieldMask": "photos" },
      next: { revalidate: REUSE_SECONDS },
    });
    if (!details.ok) return nothing();
    const photo = ((await details.json()) as { photos?: GooglePhoto[] }).photos?.[0];
    if (!photo?.name) return nothing();

    const media = await fetch(`${PLACES}/${photo.name}/media?maxWidthPx=1200&skipHttpRedirect=true`, { headers, next: { revalidate: REUSE_SECONDS } });
    if (!media.ok) return nothing();
    const { photoUri } = (await media.json()) as { photoUri?: string };
    if (!photoUri) return nothing();

    const authors = (photo.authorAttributions ?? []).filter((a) => a.displayName).map((a) => ({ name: a.displayName!, uri: a.uri ?? null }));
    return Response.json({ src: photoUri, authors }, { headers: { "Cache-Control": `private, max-age=${REUSE_SECONDS}` } });
  } catch {
    return nothing();
  }
}
