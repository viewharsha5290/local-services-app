"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchX } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ProviderCard } from "@/components/ProviderCard";
import { StarPicker } from "@/components/Stars";
import { useApp } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { CategoryIcon } from "@/lib/categoryIcons";
import { useRequireAuth } from "@/lib/useActions";

export default function SearchHomePage() {
  const { providers, pendingFollowUp, resolveFollowUp, locationLabel } = useApp();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const [query, setQuery] = useState("");

  function submitSearch() {
    if (!query.trim()) return;
    router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
  }

  const trusted = [...providers].sort((a, b) => b.rating - a.rating || b.recommendCount - a.recommendCount).slice(0, 5);

  return (
    <>
      <TopBar location />
      <div style={{ paddingTop: 4 }}>
        {pendingFollowUp && (
          <div className="card blueprint" style={{ marginBottom: 18 }}>
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <span className="tag tag-accent" style={{ marginBottom: 8, display: "inline-block" }}>
              Follow-up
            </span>
            <div className="card-title">How did it go with {pendingFollowUp.providerName}?</div>
            <div className="card-meta" style={{ marginBottom: 10 }}>You reached out {timeAgo(pendingFollowUp.timestamp)}</div>
            <div style={{ marginBottom: 12 }}>
              <StarPicker
                value={0}
                size={26}
                onChange={(v) => resolveFollowUp(pendingFollowUp.id, "hired", v)}
              />
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--color-neutral-600)" }}>
              <button type="button" onClick={() => resolveFollowUp(pendingFollowUp.id, "not-hired")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", font: "inherit" }}>
                Didn&rsquo;t hire them
              </button>
              <button type="button" onClick={() => resolveFollowUp(pendingFollowUp.id, "snooze")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", font: "inherit" }}>
                Remind me later
              </button>
            </div>
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search handyman, attorney, mechanic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          />
        </div>

        <div className="chip-row" style={{ marginBottom: 18 }}>
          <button type="button" className="tag tag-accent" onClick={() => router.push("/search/results")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="tag tag-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={() => router.push(`/search/results?category=${encodeURIComponent(c)}`)}
            >
              <CategoryIcon category={c} size={12} />
              {c}
            </button>
          ))}
        </div>

        <div className="section-label">Trusted near you</div>
        {trusted.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 16px 0" }}>
            <SearchX size={34} strokeWidth={1.4} />
            <h3 style={{ margin: "12px 0 6px" }}>No providers near {locationLabel ?? "you"} yet</h3>
            <p style={{ fontSize: 12.5, opacity: 0.7, margin: "0 0 20px" }}>
              This area is still growing. Know someone good? Your recommendation becomes their listing.
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => requireAuth({ type: "recommend" })}>
              Recommend a provider
            </button>
          </div>
        ) : (
          <div className="provider-list">
            {trusted.map((p) => (
              <ProviderCard key={p.id} provider={p} showCategory />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
