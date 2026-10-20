import { isValidPostalCode } from "./postalCode";

export interface Coords {
  lat: number;
  lng: number;
}

/** Where the visitor is, from the browser. Rejects with a sentence to show them when it can't. */
export function currentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("This browser can’t share your location. Enter your postal code instead."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location is blocked for this site. Allow it in your browser settings, or enter your postal code."
              : "Couldn’t get your location. Try again, or enter your postal code."
          )
        ),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/** A postal code's position (app/api/postal-coords), or a sentence to show when there isn't one. */
export async function postalCodePosition(code: string): Promise<Coords> {
  if (!isValidPostalCode(code)) throw new Error("Enter a valid postal code, like L8E or L8E 4A7.");
  const res = await fetch(`/api/postal-coords?code=${encodeURIComponent(code.trim())}`).catch(() => null);
  if (res?.status === 200) return (await res.json()) as Coords;
  throw new Error("Couldn’t find that postal code. Check it, or share your location instead.");
}
