"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Search, SearchX } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { useApp } from "@/lib/store";
import { Category, Provider } from "@/lib/types";
import { useRequireAuth } from "@/lib/useActions";

type Sort = "nearest" | "top" | "verified";

/** Neighbour rating first; Google's only breaks ties among listings without neighbour reviews. */
function topScore(p: Provider) {
  return (p.reviewCount > 0 ? 10 + p.rating : 0) + (p.googleRating ?? 0) / 10;
}

function ResultsHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return (
    <div className="results-head">
      <button type="button" className="topbar-back" onClick={() => router.back()} aria-label="Back">
        <ChevronLeft size={24} strokeWidth={2.5} />
      </button>
      <Link href="/search" className="searchpill compact" aria-label={`${title}, ${subtitle}. Start a new search`}>
        <Search size={18} strokeWidth={2.5} style={{ flex: "none" }} />
        <span style={{ minWidth: 0 }}>
          <span className="t">{title}</span>
          <span className="s">{subtitle}</span>
        </span>
      </Link>
    </div>
  );
}

function ResultsInner() {
  const searchParams = useSearchParams();
  const { providers, locationLabel } = useApp();
  const requireAuth = useRequireAuth();
  const [sort, setSort] = useState<Sort>("nearest");
  const [broaden, setBroaden] = useState(false);

  const category = searchParams.get("category") as Category | null;
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const place = locationLabel?.includes(",") ? locationLabel.split(",")[0] : (locationLabel ?? "you");

  const filtered = useMemo(() => {
    let list = providers;
    if (category && !broaden) list = list.filter((p) => p.category === category);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    if (sort === "nearest") list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (sort === "top") list = [...list].sort((a, b) => topScore(b) - topScore(a));
    if (sort === "verified") list = list.filter((p) => p.verified);
    return list;
  }, [providers, category, broaden, q, sort]);

  const title = category && !broaden ? category : q ? `"${q}"` : "Everyone nearby";

  return (
    <>
      <ResultsHeader title={title} subtitle={`${place} · ${filtered.length} listed`} />
      <div className="chip-row" style={{ marginBottom: 18 }} role="group" aria-label="Sort and filter">
        {(
          [
            ["nearest", "Nearest"],
            ["top", "Top rated"],
            ["verified", "Verified only"],
          ] as [Sort, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={`chip ${sort === id ? "on" : ""}`} aria-pressed={sort === id} onClick={() => setSort(id)}>
            {label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <SearchX size={40} strokeWidth={1.4} />
          <h3 style={{ margin: "14px 0 6px" }}>
            {sort === "verified" ? "No verified listings here yet" : `No ${(category ?? "providers").toString().toLowerCase()} near ${place} yet`}
          </h3>
          <p style={{ margin: "0 0 22px" }}>This area is still growing. Know someone good? Your recommendation becomes their listing.</p>
          <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={() => requireAuth({ type: "recommend" })}>
            Recommend a provider
          </button>
          {sort === "verified" ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setSort("nearest")}>
              Show all listings
            </button>
          ) : (
            !broaden &&
            category && (
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setBroaden(true)}>
                Browse everything nearby
              </button>
            )
          )}
        </div>
      ) : (
        <div className="provider-list">
          {filtered.map((p) => (
            <ProviderCard key={p.id} provider={p} showCategory={!category || broaden} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsHeader title="Loading…" subtitle="" />}>
      <ResultsInner />
    </Suspense>
  );
}
