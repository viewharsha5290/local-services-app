"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Provider } from "@/lib/types";
import { GoogleRating, Stars } from "./Stars";
import { CategoryIcon } from "@/lib/categoryIcons";
import { formatLocationMeta } from "@/lib/format";

export function ProviderCard({ provider, showCategory = false }: { provider: Provider; showCategory?: boolean }) {
  return (
    <Link href={`/provider/${provider.id}`} className="card" style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 42,
          height: 42,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-accent-100)",
          color: "var(--color-accent-700)",
          border: "1px solid var(--color-divider)",
        }}
      >
        <CategoryIcon category={provider.category} size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div className="card-title">{provider.name}</div>
          {provider.verified && (
            <span className="tag tag-accent" style={{ display: "flex", alignItems: "center", gap: 3, flex: "none" }}>
              <ShieldCheck size={11} /> Verified
            </span>
          )}
        </div>
        <div className="card-meta">
          {showCategory ? `${provider.category}${formatLocationMeta(provider) ? " · " : ""}` : ""}
          {formatLocationMeta(provider)}
        </div>
        {provider.reviewCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <Stars rating={provider.rating} />
            <span style={{ opacity: 0.7 }}>{provider.rating.toFixed(1)} · Tap to view</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>Recommended by {provider.recommendCount} neighbors</div>
        )}
        <GoogleRating provider={provider} />
      </div>
    </Link>
  );
}
