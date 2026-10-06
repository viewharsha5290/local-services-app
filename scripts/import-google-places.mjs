// One-time (re-runnable) bulk import of real businesses from the Google Places API (New)
// into the `providers` table. Run from web/:
//
//   npm run import:google -- --dry-run                      # preview Toronto, all categories
//   npm run import:google -- --city "Toronto, ON" --city "Mississauga, ON"
//   npm run import:google -- --category Electrician --pages 3
//
// Flags:
//   --city "<City, PR>"   repeatable; must match lib/cities.ts exactly. Default: Toronto, ON
//   --category <name>     repeatable; one of lib/types.ts CATEGORIES. Default: all
//   --pages <1-3>         result pages per query (20 results each). Default: 1
//   --include-no-phone    keep businesses Google has no phone number for (skipped by default,
//                         since calling/messaging is the app's core action)
//   --dry-run             print what would be written; needs only GOOGLE_PLACES_API_KEY
//
// Env (.env.local): GOOGLE_PLACES_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// The service-role key bypasses Row Level Security — it's used only by this local script and
// must never get a NEXT_PUBLIC_ prefix.
//
// Idempotent: rows are keyed on google_place_id, so re-running refreshes existing imports
// instead of duplicating them. A hand-seeded row (supabase/seed.sql) with the same phone
// number is linked to its Google place rather than duplicated, and keeps its own name/bio.
// Never touches verified / claimed / recommend_count or any reviews.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CATEGORY_QUERIES = {
  Handyman: { text: "handyman" },
  Mechanic: { text: "auto repair mechanic", type: "car_repair" },
  Attorney: { text: "lawyer", type: "lawyer" },
  Auditor: { text: "accountant CPA", type: "accounting" },
  // No includedType: Places (New) has only per-faith types (church, mosque, synagogue, hindu_temple).
  "Priests & Temples": { text: "place of worship" },
  Electrician: { text: "electrician", type: "electrician" },
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.businessStatus",
  "places.editorialSummary",
  "nextPageToken",
].join(",");

// ── args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { cities: [], categories: [], pages: 1, dryRun: false, includeNoPhone: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--city") args.cities.push(argv[++i]);
    else if (a === "--category") args.categories.push(argv[++i]);
    else if (a === "--pages") args.pages = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--include-no-phone") args.includeNoPhone = true;
    else fail(`Unknown argument: ${a}`);
  }
  if (!args.cities.length) args.cities = ["Toronto, ON"];
  if (!args.categories.length) args.categories = Object.keys(CATEGORY_QUERIES);
  if (!(args.pages >= 1 && args.pages <= 3)) fail("--pages must be 1, 2 or 3 (Google caps text search at 60 results).");
  return args;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// lib/cities.ts is the source of truth for city strings — the app's city-wide search
// matches `providers.cities` against it verbatim.
function loadKnownCities() {
  const src = readFileSync(new URL("../lib/cities.ts", import.meta.url), "utf8");
  return new Set([...src.matchAll(/"([^"]+, [A-Z]{2})"/g)].map((m) => m[1]));
}

// ── Google ──────────────────────────────────────────────────────────────────
async function searchText(apiKey, body) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) fail(`Google Places error ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`);
  return json;
}

async function searchCategoryInCity(apiKey, category, city, pages) {
  const { text, type } = CATEGORY_QUERIES[category];
  const body = { textQuery: `${text} in ${city}, Canada`, regionCode: "CA", languageCode: "en", pageSize: 20 };
  if (type) Object.assign(body, { includedType: type, strictTypeFiltering: true });

  const places = [];
  let pageToken;
  for (let page = 0; page < pages; page++) {
    const json = await searchText(apiKey, pageToken ? { ...body, pageToken } : body);
    places.push(...(json.places ?? []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return places;
}

function component(place, type) {
  return place.addressComponents?.find((c) => c.types?.includes(type));
}

function digitsOnly(phone) {
  return (phone ?? "").replace(/[^\d]/g, "").replace(/^1(?=\d{10}$)/, "");
}

function toProviderRow(place, category, searchedCity, knownCities) {
  const cities = new Set([searchedCity]);
  // Also tag the place's own municipality when it's a city the app knows, e.g. a
  // "Toronto" search result that's actually based in Vaughan.
  const locality = component(place, "locality")?.longText;
  const province = component(place, "administrative_area_level_1")?.shortText;
  if (locality && province && knownCities.has(`${locality}, ${province}`)) cities.add(`${locality}, ${province}`);

  const areaNote =
    component(place, "neighborhood")?.longText ?? component(place, "sublocality_level_1")?.longText ?? component(place, "sublocality")?.longText ?? locality ?? null;
  const international = place.internationalPhoneNumber ?? null;

  return {
    google_place_id: place.id,
    // Many listings pad the name with keywords after a pipe: "Acme CPA | Affordable Tax Accountant | ...".
    name: (place.displayName?.text ?? "Unnamed business").split(" | ")[0].trim(),
    category,
    area_note: areaNote,
    bio: place.editorialSummary?.text ?? null,
    phone: international ? `+${international.replace(/[^\d]/g, "")}` : null,
    phone_display: place.nationalPhoneNumber ?? international,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    address: place.formattedAddress ?? null,
    website: place.websiteUri ?? null,
    cities: [...cities],
  };
}

// ── Supabase ────────────────────────────────────────────────────────────────
async function fetchAll(supabase, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("providers").select(columns).range(from, from + 999);
    if (error) fail(`Supabase read failed: ${error.message}${error.message.includes("google_place_id") ? " — run supabase/migration_003_google_places.sql first." : ""}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const knownCities = loadKnownCities();
  for (const c of args.cities) if (!knownCities.has(c)) fail(`"${c}" isn't in lib/cities.ts — use the exact "City, PR" string.`);
  for (const c of args.categories) if (!CATEGORY_QUERIES[c]) fail(`Unknown category "${c}". Use one of: ${Object.keys(CATEGORY_QUERIES).join(", ")}`);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) fail("GOOGLE_PLACES_API_KEY is not set in .env.local.");

  // ── fetch + merge across queries (same place can show up for several cities) ──
  const byPlaceId = new Map();
  let skippedClosed = 0;
  let skippedNoPhone = 0;
  for (const city of args.cities) {
    for (const category of args.categories) {
      const places = await searchCategoryInCity(apiKey, category, city, args.pages);
      let kept = 0;
      for (const place of places) {
        if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
          skippedClosed++;
          continue;
        }
        const row = toProviderRow(place, category, city, knownCities);
        if (!row.phone && !args.includeNoPhone) {
          skippedNoPhone++;
          continue;
        }
        const existing = byPlaceId.get(row.google_place_id);
        if (existing) existing.cities = [...new Set([...existing.cities, ...row.cities])];
        else byPlaceId.set(row.google_place_id, row);
        kept++;
      }
      console.log(`  ${city.padEnd(20)} ${category.padEnd(12)} ${String(places.length).padStart(3)} found, ${kept} kept`);
    }
  }
  const rows = [...byPlaceId.values()];
  console.log(`\n${rows.length} unique businesses (skipped ${skippedClosed} closed, ${skippedNoPhone} without a phone number).`);

  if (args.dryRun) {
    for (const r of rows) console.log(`  [${r.category}] ${r.name} — ${r.phone_display ?? "no phone"} — ${r.area_note ?? "?"} — ${r.cities.join(" / ")}`);
    console.log("\nDry run: nothing written.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local (or pass --dry-run).");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const existing = await fetchAll(supabase, "id, google_place_id, phone, cities, lat, lng");
  const existingByPlaceId = new Map(existing.filter((r) => r.google_place_id).map((r) => [r.google_place_id, r]));
  const unlinkedByPhone = new Map(existing.filter((r) => !r.google_place_id && r.phone).map((r) => [digitsOnly(r.phone), r]));
  const syncedAt = new Date().toISOString();

  const upserts = [];
  let linked = 0;
  for (const row of rows) {
    const prior = existingByPlaceId.get(row.google_place_id);
    const mergedCities = [...new Set([...(prior?.cities ?? []), ...row.cities])];
    const seedMatch = !prior && row.phone ? unlinkedByPhone.get(digitsOnly(row.phone)) : undefined;

    if (seedMatch) {
      // Link the hand-curated seed row to its Google place; keep its own name/bio/area.
      const { error } = await supabase
        .from("providers")
        .update({
          google_place_id: row.google_place_id,
          address: row.address,
          website: row.website,
          lat: seedMatch.lat ?? row.lat,
          lng: seedMatch.lng ?? row.lng,
          cities: [...new Set([...(seedMatch.cities ?? []), ...row.cities])],
          synced_at: syncedAt,
        })
        .eq("id", seedMatch.id);
      if (error) fail(`Linking "${row.name}" failed: ${error.message}`);
      unlinkedByPhone.delete(digitsOnly(row.phone));
      linked++;
      continue;
    }
    upserts.push({ ...row, cities: mergedCities, synced_at: syncedAt });
  }

  const inserted = upserts.filter((r) => !existingByPlaceId.has(r.google_place_id)).length;
  for (let i = 0; i < upserts.length; i += 200) {
    const { error } = await supabase.from("providers").upsert(upserts.slice(i, i + 200), { onConflict: "google_place_id" });
    if (error) fail(`Upsert failed: ${error.message}`);
  }

  console.log(`\n✔ ${inserted} new, ${upserts.length - inserted} refreshed, ${linked} linked to existing seed rows.`);
}

main().catch((err) => fail(err.stack ?? String(err)));
