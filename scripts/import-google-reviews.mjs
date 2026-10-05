// Pulls Google's rating, review count and up to 5 reviews (Google's API maximum) for every
// provider that came from scripts/import-google-places.mjs. Run from web/ after that import:
//
//   npm run import:google-reviews -- --dry-run --limit 3     # preview a few, write nothing
//   npm run import:google-reviews                            # every provider not yet synced
//   npm run import:google-reviews -- --city "Hamilton, ON" --refresh
//
// Flags:
//   --city "<City, PR>"  repeatable; only providers serving these cities. Default: all
//   --refresh            re-fetch providers that were already synced (default: only never-synced)
//   --limit <n>          stop after n providers
//   --dry-run            print what would be written; needs only GOOGLE_PLACES_API_KEY + Supabase URL/key
//
// Reviews go into `google_reviews`, never `reviews`: they're strangers' Google reviews, not
// neighbor recommendations, so they must not count toward the app's own rating. Each run
// replaces a provider's Google reviews wholesale, so re-running refreshes rather than duplicates.
//
// Cost: one Place Details (Enterprise + Atmosphere tier) call per provider.

import { createClient } from "@supabase/supabase-js";

const FIELD_MASK = "rating,userRatingCount,reviews,googleMapsUri";
const CONCURRENCY = 5;

function parseArgs(argv) {
  const args = { cities: [], refresh: false, limit: Infinity, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--city") args.cities.push(argv[++i]);
    else if (a === "--refresh") args.refresh = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else fail(`Unknown argument: ${a}`);
  }
  if (!(args.limit > 0)) fail("--limit must be a positive number.");
  return args;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

async function fetchPlaceDetails(apiKey, placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google Places error ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`);
  return json;
}

function toReviewRows(providerId, place) {
  return (place.reviews ?? [])
    .filter((r) => r.rating >= 1 && r.rating <= 5)
    .map((r) => ({
      provider_id: providerId,
      author_name: r.authorAttribution?.displayName ?? "Google user",
      author_uri: r.authorAttribution?.uri ?? null,
      author_photo_uri: r.authorAttribution?.photoUri ?? null,
      rating: Math.round(r.rating),
      text: r.text?.text ?? r.originalText?.text ?? "",
      published_at: r.publishTime ?? null,
      google_maps_uri: r.googleMapsUri ?? null,
    }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) fail("GOOGLE_PLACES_API_KEY is not set in .env.local.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // A dry run only reads providers, which the public key can do; writes need the service role.
  const key = args.dryRun ? (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const providers = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("providers").select("id, name, google_place_id").not("google_place_id", "is", null).order("created_at").range(from, from + 999);
    if (!args.refresh) query = query.is("google_reviews_synced_at", null);
    if (args.cities.length) query = query.overlaps("cities", `{${args.cities.map((c) => `"${c}"`).join(",")}}`);
    const { data, error } = await query;
    if (error) fail(`Supabase read failed: ${error.message}${error.message.includes("google_reviews_synced_at") ? " — run supabase/migration_004_google_reviews.sql first." : ""}`);
    providers.push(...data);
    if (data.length < 1000) break;
  }
  const todo = providers.slice(0, args.limit);
  console.log(`${todo.length} provider(s) to fetch${args.refresh ? "" : " (never synced)"}.`);

  let done = 0;
  let reviewTotal = 0;
  const failures = [];
  const queue = [...todo];

  async function worker() {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const place = await fetchPlaceDetails(apiKey, p.google_place_id);
        const rows = toReviewRows(p.id, place);
        reviewTotal += rows.length;

        if (args.dryRun) {
          console.log(`\n  ${p.name} — ${place.rating ?? "no rating"} (${place.userRatingCount ?? 0} on Google), ${rows.length} review(s)`);
          for (const r of rows) console.log(`    ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} ${r.author_name}: ${r.text.slice(0, 90).replace(/\s+/g, " ")}${r.text.length > 90 ? "…" : ""}`);
        } else {
          const { error: delError } = await supabase.from("google_reviews").delete().eq("provider_id", p.id);
          if (delError) throw new Error(delError.message);
          if (rows.length) {
            const { error: insError } = await supabase.from("google_reviews").insert(rows);
            if (insError) throw new Error(insError.message);
          }
          const { error: updError } = await supabase
            .from("providers")
            .update({
              google_rating: place.rating ?? null,
              google_rating_count: place.userRatingCount ?? 0,
              google_maps_uri: place.googleMapsUri ?? null,
              google_reviews_synced_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          if (updError) throw new Error(updError.message);
        }
      } catch (err) {
        failures.push(`${p.name}: ${err.message}`);
      }
      done++;
      if (!args.dryRun && done % 25 === 0) console.log(`  …${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n${args.dryRun ? "Dry run: nothing written. Would store" : "✔ Stored"} ${reviewTotal} review(s) across ${done - failures.length} provider(s).`);
  if (failures.length) {
    console.log(`✖ ${failures.length} failed (re-run to retry — only unsynced providers are fetched):`);
    for (const f of failures.slice(0, 10)) console.log(`    ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => fail(err.stack ?? String(err)));
