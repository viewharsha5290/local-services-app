"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { currentPosition, postalCodePosition } from "@/lib/locate";

/** Shown under "Nearby" until the site knows where the visitor is: share the location, or type a
 * postal code. Either one only sets the point distances are measured from; the city being browsed
 * stays the same. */
export function NearMePrompt() {
  const { setUserCoords } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"gps" | "code" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "gps" | "code", find: () => Promise<{ lat: number; lng: number }>) {
    setBusy(kind);
    setError(null);
    try {
      setUserCoords(await find());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="nearme">
      <p className="sortnote" style={{ marginBottom: 10 }}>
        To order by distance we need to know where you are.
      </p>
      <div className="nearme-row">
        <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => run("gps", currentPosition)}>
          <Crosshair size={16} /> {busy === "gps" ? "Finding you…" : "Use my location"}
        </button>
        <form
          className="nearme-code"
          onSubmit={(e) => {
            e.preventDefault();
            run("code", () => postalCodePosition(code));
          }}
        >
          <label htmlFor="nearme-code" className="sr-only">
            Postal code
          </label>
          <input id="nearme-code" className="input" placeholder="or postal code, e.g. L8E" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="postal-code" maxLength={7} />
          <button type="submit" className="btn btn-primary" disabled={busy !== null || !code.trim()}>
            {busy === "code" ? "…" : "Go"}
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="nearme-error">
          {error}
        </p>
      )}
    </div>
  );
}
