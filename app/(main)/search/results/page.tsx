"use client";

import { useGoBack } from "@/lib/useGoBack";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

/** A search word, lower-cased and without a plural "s", so "cakes" finds "cake" and the reverse. */
const stem = (word: string) => (word.length > 3 ? word.replace(/s$/, "") : word);
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem);

/** How well a listing answers a search: 0 means not at all. Every word asked for has to appear
 * somewhere; the name counts most, then the trade, then the description, area and reviews. */
function relevance(p: Provider, wanted: string[], tradeWords: string) {
  const name = words(p.name);
  const trade = words(`${p.category} ${tradeWords}`);
  const rest = words(`${p.bio ?? ""} ${p.areaNote ?? ""} ${p.reviews.map((r) => r.text).join(" ")}`);
  let score = 0;
  for (const w of wanted) {
    const hit = (list: string[]) => list.some((x) => x.startsWith(w));
    if (hit(name)) score += 5;
    else if (hit(trade)) score += 3;
    else if (hit(rest)) score += 1;
    else return 0;
  }
  return score;
}

function ResultsHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const goBack = useGoBack();
  return (
    <div className="results-head">
      <button type="button" className="topbar-back" onClick={goBack} aria-label="Back">
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
  const { providers, locationLabel, categories } = useApp();
  const requireAuth = useRequireAuth();
  const [sort, setSort] = useState<Sort>("nearest");
  const [broaden, setBroaden] = useState(false);

  const category = searchParams.get("category") as Category | null;
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const place = locationLabel?.includes(",") ? locationLabel.split(",")[0] : (locationLabel ?? "you");

  const filtered = useMemo(() => {
    let list = providers;
    if (category && !broaden) list = list.filter((p) => p.category === category);
    if (q) {
      const wanted = words(q);
      const tradeWords = new Map(categories.map((c) => [c.name, `${c.one} ${c.many}`]));
      const scored = list.map((p) => ({ p, score: relevance(p, wanted, tradeWords.get(p.category) ?? "") })).filter((x) => x.score > 0);
      // best match first; the sorts below keep this order among listings they can't tell apart
      list = scored.sort((a, b) => b.score - a.score).map((x) => x.p);
    }
    if (sort === "nearest") list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (sort === "top") list = [...list].sort((a, b) => topScore(b) - topScore(a));
    if (sort === "verified") list = list.filter((p) => p.verified);
    return list;
  }, [providers, categories, category, broaden, q, sort]);
  const anyVerified = providers.some((p) => p.verified);

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
        )
          // a filter that can only ever come back empty isn't offered
          .filter(([id]) => id !== "verified" || anyVerified)
          .map(([id, label]) => (
          <button key={id} type="button" className={`chip ${sort === id ? "on" : ""}`} aria-pressed={sort === id} onClick={() => setSort(id)}>
            {label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <SearchX size={40} strokeWidth={1.4} />
          <h3 style={{ margin: "14px 0 6px" }}>
            {sort === "verified" ? "No verified listings here yet" : q ? `Nothing found for “${q}” in ${place}` : `No ${(category ?? "businesses").toString().toLowerCase()} listed in ${place} yet`}
          </h3>
          <p style={{ margin: "0 0 22px" }}>
            {q
              ? "Try a different word, or browse by trade. Know someone good for this? Your recommendation becomes their listing."
              : "This area is still growing. Know someone good? Your recommendation becomes their listing."}
          </p>
          <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={() => requireAuth({ type: "recommend" })}>
            Recommend a provider
          </button>
          {sort === "verified" ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setSort("nearest")}>
              Show all listings
            </button>
          ) : (
            (q ? (
              <Link href="/search" className="btn btn-ghost btn-block">
                Browse by trade
              </Link>
            ) : (
              !broaden &&
              category && (
                <button type="button" className="btn btn-ghost btn-block" onClick={() => setBroaden(true)}>
                  Browse everything nearby
                </button>
              )
            ))
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
