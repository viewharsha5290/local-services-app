import { isValidPostalCode, normalizePostalCode } from "@/lib/postalCode";

/** Turns a Canadian postal code (or just its first three characters) into a point on the map, so
 * "Nearby" can measure distance from it. Asks Google Places for the code's location; the answer is
 * kept for 30 days (the longest Google allows a location to be stored), so each code is looked up
 * at most once a month. Empty when the code isn't valid or Google doesn't know it. */

const KEEP_SECONDS = 30 * 24 * 3600;

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !isValidPostalCode(code)) return new Response(null, { status: 204 });
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.location" },
      body: JSON.stringify({ textQuery: `${normalizePostalCode(code)}, Canada`, regionCode: "CA", pageSize: 1 }),
      next: { revalidate: KEEP_SECONDS },
    });
    if (!res.ok) return new Response(null, { status: 204 });
    const location = ((await res.json()) as { places?: { location?: { latitude: number; longitude: number } }[] }).places?.[0]?.location;
    if (!location) return new Response(null, { status: 204 });
    return Response.json({ lat: location.latitude, lng: location.longitude }, { headers: { "Cache-Control": `public, max-age=${KEEP_SECONDS}` } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
