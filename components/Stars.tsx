"use client";

import { Star } from "lucide-react";
import { Provider } from "@/lib/types";

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill={i < full ? "currentColor" : "none"} strokeWidth={1.6} />
      ))}
    </span>
  );
}

/** Google's aggregate rating, always labelled as Google's so it never reads as the neighbour rating. */
export function GoogleRating({ provider }: { provider: Pick<Provider, "googleRating" | "googleRatingCount"> }) {
  if (provider.googleRating == null || !provider.googleRatingCount) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--color-neutral-500)" }}>
      <Star size={11} fill="var(--color-rating)" color="var(--color-rating)" strokeWidth={1.6} />
      {provider.googleRating.toFixed(1)} · {provider.googleRatingCount.toLocaleString()} on Google
    </span>
  );
}

export function StarPicker({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <span className="stars" style={{ gap: 8 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`Rate ${n} stars`}>
            <Star size={size} fill={n <= value ? "currentColor" : "none"} strokeWidth={1.6} />
          </button>
        );
      })}
    </span>
  );
}
