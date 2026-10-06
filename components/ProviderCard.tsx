"use client";

import Link from "next/link";
import { BadgeCheck, Heart, ShieldCheck, Star } from "lucide-react";
import { Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useRequireAuth } from "@/lib/useActions";
import { formatLocationMeta } from "@/lib/format";
import { ListingCover } from "./Cover";

/** What to show as a listing's headline score. Neighbour reviews win when there are any; Google's
 * aggregate is the fallback and is always worded as Google's, never as the neighbour rating. */
export function scoreOf(p: Provider): { value: string; label: string; line: string } | null {
  if (p.reviewCount > 0) {
    const google = p.googleRating != null && p.googleRatingCount ? ` · ${p.googleRating.toFixed(1)} on Google` : "";
    return {
      value: p.rating.toFixed(1),
      label: `${p.rating.toFixed(1)} from neighbours`,
      line: `${p.reviewCount} neighbour ${p.reviewCount === 1 ? "review" : "reviews"}${google}`,
    };
  }
  if (p.googleRating != null && p.googleRatingCount) {
    return {
      value: p.googleRating.toFixed(1),
      label: `${p.googleRating.toFixed(1)} on Google`,
      line: `${p.googleRatingCount.toLocaleString()} Google ${p.googleRatingCount === 1 ? "review" : "reviews"}`,
    };
  }
  return null;
}

export function ProviderCard({ provider, showCategory = false }: { provider: Provider; showCategory?: boolean }) {
  const { isSaved } = useApp();
  const requireAuth = useRequireAuth();
  const saved = isSaved(provider.id);
  const score = scoreOf(provider);
  const place = formatLocationMeta(provider);
  const fallbackLine =
    provider.recommendCount > 0
      ? `Recommended by ${provider.recommendCount} ${provider.recommendCount === 1 ? "neighbour" : "neighbours"}`
      : "New listing";

  return (
    <div className="pcard">
      <Link href={`/provider/${provider.id}`} className="pcard-link">
        <ListingCover provider={provider} className="pcard-cover" />
        <div className="pcard-head">
          <span className="pcard-name">{provider.name}</span>
          {score && (
            <span className="pcard-score" aria-label={score.label}>
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {score.value}
            </span>
          )}
        </div>
        <div className="pcard-meta">{[showCategory ? provider.category : null, place].filter(Boolean).join(" · ") || provider.category}</div>
        <div className="pcard-meta">{score?.line ?? fallbackLine}</div>
      </Link>
      {(provider.claimed || provider.verified) && (
        <span className="pcard-badge">
          {provider.claimed ? <BadgeCheck size={13} /> : <ShieldCheck size={13} />}
          {provider.claimed ? "Claimed" : "Verified"}
        </span>
      )}
      <button
        type="button"
        className={`pcard-save ${saved ? "on" : ""}`}
        aria-label={saved ? `Remove ${provider.name} from saved` : `Save ${provider.name}`}
        aria-pressed={saved}
        onClick={() => requireAuth({ type: "save", providerId: provider.id })}
      >
        <Heart size={19} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
