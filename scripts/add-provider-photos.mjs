// Adds work photos to a listing: uploads them to the public `provider-photos` bucket and appends
// their paths to providers.photos (the first photo is the listing's cover).
//
//   node --env-file=.env.local scripts/add-provider-photos.mjs <provider-id> <photo.jpg> [more.jpg ...]
//   node --env-file=.env.local scripts/add-provider-photos.mjs <provider-id> --replace <photo.jpg> ...
//
// Resize photos and strip their metadata (phone photos carry GPS) before running this — the files
// are published exactly as given. Needs SUPABASE_SERVICE_ROLE_KEY and migration 008.
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "provider-photos";
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const [providerId, ...files] = args.filter((a) => a !== "--replace");
if (!providerId || files.length === 0) {
  console.error("usage: add-provider-photos.mjs <provider-id> [--replace] <photo> [more photos]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: provider, error: findError } = await supabase.from("providers").select("id,name,photos").eq("id", providerId).single();
if (findError) throw new Error(`listing not found (or migration 008 not run): ${findError.message}`);

const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets?.some((b) => b.name === BUCKET)) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "5MB", allowedMimeTypes: Object.values(TYPES) });
  if (error) throw error;
  console.log(`created public bucket ${BUCKET}`);
}

const added = [];
for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!TYPES[ext]) throw new Error(`unsupported file type: ${file}`);
  const path = `${providerId}/${randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, await readFile(file), { contentType: TYPES[ext], cacheControl: "31536000" });
  if (error) throw error;
  added.push(path);
  console.log(`uploaded ${file} -> ${path}`);
}

const old = provider.photos ?? [];
const photos = replace ? added : [...old, ...added];
const { error: updateError } = await supabase.from("providers").update({ photos }).eq("id", providerId);
if (updateError) throw updateError;
if (replace && old.length) await supabase.storage.from(BUCKET).remove(old);
console.log(`${provider.name}: ${photos.length} photo${photos.length === 1 ? "" : "s"}`);
