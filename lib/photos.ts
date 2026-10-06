/** Work photos live in a public Supabase storage bucket at <provider id>/<file>; providers.photos
 * holds those paths in display order (first = cover). */
export const PHOTO_BUCKET = "provider-photos";
export const MAX_PHOTOS = 12;
const MAX_EDGE = 1600;

const publicBase = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/`;

export function photoUrl(path: string) {
  return publicBase() + path;
}

export function photoPath(url: string) {
  return url.startsWith(publicBase()) ? url.slice(publicBase().length) : url;
}

/** Shrinks a picked image to at most 1600px on its long edge and re-encodes it as a JPEG. Drawing
 * it to a canvas also drops the file's metadata — phone photos carry the GPS position of wherever
 * they were taken, which for a tradesperson is a customer's home. */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare photos.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.85));
}
