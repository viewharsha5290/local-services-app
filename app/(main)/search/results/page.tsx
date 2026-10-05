"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ProviderCard } from "@/components/ProviderCard";
import { useApp } from "@/lib/store";
import { Category } from "@/lib/types";
import { useRequireAuth } from "@/lib/useActions";

type Sort = "nearest" | "top" | "verified";

function ResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { providers, locationLabel } = useApp();
  const requireAuth = useRequireAuth();
  const [sort, setSort] = useState<Sort>("nearest");
  const [broaden, setBroaden] = useState(false);

  const category = searchParams.get("category") as Category | null;
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const shortLocation = locationLabel?.includes(",") ? locationLabel.split(",")[0] : locationLabel?.split(" ")[0];

  const filtered = useMemo(() => {
    let list = providers;
    if (category && !broaden) list = list.filter((p) => p.category === category);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    if (sort === "nearest") list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (sort === "top") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "verified") list = list.filter((p) => p.verified);
    return list;
  }, [providers, category, broaden, q, sort]);

  const title = category ?? (q ? `"${q}"` : "All providers");

  if (filtered.length === 0) {
    return (
      <>
        <TopBar back title={title} subtitle={`near ${locationLabel} · 0 results`} />
        <div className="empty-state">
          <SearchX size={40} strokeWidth={1.4} />
          <h3 style={{ margin: "14px 0 6px" }}>No {(category ?? "providers").toString().toLowerCase()} near {shortLocation} yet</h3>
          <p style={{ fontSize: 12.5, opacity: 0.7, margin: "0 0 22px" }}>
            This area is still growing. Know someone good? Your recommendation becomes their listing.
          </p>
          <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={() => requireAuth({ type: "recommend" })}>
            Recommend a provider
          </button>
          {!broaden && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setBroaden(true)}>
              Browse everything nearby
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back title={title} subtitle={`near ${locationLabel} · ${filtered.length} result${filtered.length === 1 ? "" : "s"}`} />
      <div style={{ paddingTop: 4 }}>
        <div className="chip-row" style={{ marginBottom: 16 }}>
          <button type="button" className={`tag ${sort === "nearest" ? "tag-accent" : "tag-outline"}`} onClick={() => setSort("nearest")}>
            Nearest
          </button>
          <button type="button" className={`tag ${sort === "top" ? "tag-accent" : "tag-outline"}`} onClick={() => setSort("top")}>
            Top rated
          </button>
          <button type="button" className={`tag ${sort === "verified" ? "tag-accent" : "tag-outline"}`} onClick={() => setSort("verified")}>
            Verified only
          </button>
        </div>
        <div className="provider-list">
          {filtered.map((p) => (
            <ProviderCard key={p.id} provider={p} showCategory={!category} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <TopBar back title="Loading…" />
      }
    >
      <ResultsInner />
    </Suspense>
  );
}
