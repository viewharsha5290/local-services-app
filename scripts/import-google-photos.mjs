// Gives every Google-imported listing that has no photo of its own Google's first photo of the
// place: copies it into the `provider-photos` bucket as its cover and records who took it in
// providers.photo_credits, which the listing page shows as "Photo from Google · <name>".
// Run from web/ after migration 020:
//
//   node --env-file=.env.local scripts/import-google-photos.mjs --dry-run --limit 3
//   node --env-file=.env.local scripts/import-google-photos.mjs
//   node --env-file=.env.local scripts/import-google-photos.mjs --city "Hamilton, ON"
//   node --env-file=.env.local scripts/import-google-photos.mjs --remove     # take them all back out
//
// Google's terms do not allow keeping copies of its photos; the site's owner chose to anyway.
// Each photo keeps its credit, and --remove (or deleting it on the Edit listing screen) undoes it.
//
// A listing's "last updated" date is put back afterwards, so this doesn't push 300 listings to
// the top of "Recently active". Cost: one free Place Details call and one billed Place Photo call
// per listing.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "provider-photos";
const PLACES = "https://places.googleapis.com/v1";
const CONCURRENCY = 4;

const args = { cities: [], limit: Infinity, dryRun: false, remove: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--city") args.cities.push(process.argv[++i]);
  else if (a === "--limit") args.limit = Number(process.argv[++i]);
  else if (a === "--dry-run") args.dryRun = true;
  else if (a === "--remove") args.remove = true;
  else throw new Error(`Unknown argument: ${a}`);
}

const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key && !args.remove) throw new Error("GOOGLE_PLACES_API_KEY is not set.");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// The database hands back at most 1,000 rows a request, so read in pages.
const all = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("providers").select("id,name,cities,google_place_id,photos,photo_credits,activity_at").not("google_place_id", "is", null).order("id").range(from, from + 999);
  if (error) throw new Error(`Couldn't read listings (is migration 020 applied?): ${error.message}`);
  all.push(...data);
  if (data.length < 1000) break;
}
const inScope = all.filter((p) => !args.cities.length || p.cities?.some((c) => args.cities.includes(c)));

if (args.remove) {
  const withGoogle = inScope.filter((p) => Object.keys(p.photo_credits ?? {}).length);
  for (const p of withGoogle.slice(0, args.limit)) {
    const paths = Object.keys(p.photo_credits);
    console.log(`${args.dryRun ? "would remove" : "removing"} ${paths.length} from ${p.name}`);
    if (args.dryRun) continue;
    const { error: e } = await supabase.from("providers").update({ photos: (p.photos ?? []).filter((x) => !paths.includes(x)), photo_credits: {} }).eq("id", p.id);
    if (e) throw e;
    await supabase.storage.from(BUCKET).remove(paths);
  }
  console.log(`done: ${Math.min(withGoogle.length, args.limit)} listings`);
  process.exit(0);
}

const todo = inScope.filter((p) => !(p.photos?.length)).slice(0, args.limit);
console.log(`${todo.length} Google-imported listings without a photo${args.dryRun ? " (dry run)" : ""}`);

async function photoFor(p) {
  const details = await fetch(`${PLACES}/places/${encodeURIComponent(p.google_place_id)}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "photos" } });
  if (!details.ok) throw new Error(`details ${details.status}`);
  const photo = (await details.json()).photos?.[0];
  if (!photo?.name) return null;
  const author = photo.authorAttributions?.[0];
  const credit = { source: "google", ...(author?.displayName ? { name: author.displayName } : {}), ...(author?.uri ? { uri: author.uri } : {}) };
  if (args.dryRun) return { credit };
  const media = await fetch(`${PLACES}/${photo.name}/media?maxWidthPx=1200`, { headers: { "X-Goog-Api-Key": key } });
  if (!media.ok) throw new Error(`photo ${media.status}`);
  const type = media.headers.get("content-type") ?? "";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return { credit, bytes: Buffer.from(await media.arrayBuffer()), type: type || "image/jpeg", ext };
}

const tally = { added: 0, none: 0, failed: 0, bytes: 0 };
async function one(p) {
  try {
    const got = await photoFor(p);
    if (!got) {
      tally.none++;
      console.log(`  –  ${p.name}: Google has no photo`);
      return;
    }
    if (args.dryRun) {
      tally.added++;
      console.log(`  ✓  ${p.name}: by ${got.credit.name ?? "unknown"}`);
      return;
    }
    const path = `${p.id}/google-${randomUUID()}.${got.ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, got.bytes, { contentType: got.type, cacheControl: "31536000" });
    if (up.error) throw up.error;
    const set = await supabase.from("providers").update({ photos: [path], photo_credits: { [path]: got.credit } }).eq("id", p.id);
    if (set.error) throw set.error;
    // the new-photo trigger has just stamped activity_at; put the real date back
    await supabase.from("providers").update({ activity_at: p.activity_at }).eq("id", p.id);
    tally.added++;
    tally.bytes += got.bytes.length;
    console.log(`  ✓  ${p.name}: ${Math.round(got.bytes.length / 1024)} KB, by ${got.credit.name ?? "unknown"}`);
  } catch (e) {
    tally.failed++;
    console.log(`  ✖  ${p.name}: ${e.message ?? e}`);
  }
}

const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`\nadded ${tally.added}, no Google photo ${tally.none}, failed ${tally.failed}, ${(tally.bytes / 1048576).toFixed(1)} MB stored`);
