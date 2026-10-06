"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Palette, Search, SearchX, User } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { Cover } from "@/components/Cover";
import { StarPicker } from "@/components/Stars";
import { ThemeSheet } from "@/components/ThemePicker";
import { useSheet } from "@/components/SheetProvider";
import { useApp } from "@/lib/store";
import { CATEGORIES, Category, Provider } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { CategoryIcon } from "@/lib/categoryIcons";
import { CATEGORY_COPY, countLabel } from "@/lib/categoryCopy";
import { useRequireAuth } from "@/lib/useActions";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Neighbour reviews rank first. Google's rating only orders the listings neighbours haven't
 * reviewed yet, weighted by how many Google reviews stand behind it. */
function rankScore(p: Provider) {
  if (p.reviewCount > 0) return 100 + p.rating + Math.min(p.reviewCount, 50) / 100;
  if (p.googleRating != null && p.googleRatingCount) return p.googleRating * Math.log10(p.googleRatingCount + 1);
  return p.recommendCount > 0 ? 1 : 0;
}

export default function SearchHomePage() {
  const { auth, providers, pendingFollowUp, resolveFollowUp, locationLabel } = useApp();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { open } = useSheet();
  const [query, setQuery] = useState("");

  const place = locationLabel?.includes(",") ? locationLabel.split(",")[0] : (locationLabel ?? "you");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
  }

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const p of providers) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [providers]);

  const heroes = CATEGORIES.filter((c) => counts.get(c)).sort((a, b) => counts.get(b)! - counts.get(a)!);
  const topRated = useMemo(() => [...providers].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 8), [providers]);
  const latest = useMemo(
    () =>
      providers
        .flatMap((p) => p.reviews.map((r) => ({ review: r, provider: p })))
        .sort((a, b) => new Date(b.review.date).getTime() - new Date(a.review.date).getTime())
        .slice(0, 4),
    [providers]
  );

  return (
    <>
      <div className="home-head">
        <div>
          <div className="eyebrow">{greeting()}</div>
          <button type="button" className="home-city" onClick={() => router.push("/onboarding?change=1")} aria-label={`Searching near ${place}. Change location`}>
            {place}
            <ChevronDown size={18} strokeWidth={3} />
          </button>
        </div>
        <div className="home-actions">
          <button type="button" className="round-btn" aria-label="Change theme" onClick={() => open(<ThemeSheet />)}>
            <Palette size={19} />
          </button>
          <Link href="/profile" className="round-btn solid" aria-label="Your profile">
            {auth.status === "signedIn" && auth.name ? initialsOf(auth.name) : <User size={19} />}
          </Link>
        </div>
      </div>

      <form className="searchpill" style={{ marginTop: 16 }} onSubmit={submitSearch} role="search">
        <Search size={20} strokeWidth={2.5} style={{ flex: "none" }} />
        <input
          aria-label="Search for a trade or a business"
          placeholder="What needs doing?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
        />
        <button type="submit" className="searchpill-go" aria-label="Search">
          <Search size={20} strokeWidth={2.5} />
        </button>
      </form>

      <div className="trades" style={{ marginTop: 14 }}>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="trade" onClick={() => router.push(`/search/results?category=${encodeURIComponent(c)}`)}>
            <CategoryIcon category={c} size={24} />
            {CATEGORY_COPY[c].tab}
          </button>
        ))}
      </div>

      {pendingFollowUp && (
        <div className="note-card" style={{ marginTop: 18 }}>
          <div className="card-title">How did it go with {pendingFollowUp.providerName}?</div>
          <div className="card-meta" style={{ margin: "2px 0 10px" }}>You reached out {timeAgo(pendingFollowUp.timestamp)}</div>
          <StarPicker value={0} size={30} onChange={(v) => resolveFollowUp(pendingFollowUp.id, "hired", v)} />
          <div style={{ display: "flex", gap: 18 }}>
            <button type="button" className="link" onClick={() => resolveFollowUp(pendingFollowUp.id, "not-hired")}>
              Didn&rsquo;t hire them
            </button>
            <button type="button" className="link" onClick={() => resolveFollowUp(pendingFollowUp.id, "snooze")}>
              Remind me later
            </button>
          </div>
        </div>
      )}

      {providers.length === 0 ? (
        <div className="empty-state">
          <SearchX size={38} strokeWidth={1.4} />
          <h3 style={{ margin: "12px 0 6px" }}>No one listed near {place} yet</h3>
          <p style={{ margin: "0 0 20px" }}>This area is still growing. Know someone good? Your recommendation becomes their listing.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => requireAuth({ type: "recommend" })}>
            Recommend a provider
          </button>
        </div>
      ) : (
        <>
          <div className="scroller" style={{ marginTop: 18 }}>
            {heroes.map((c) => (
              <Link key={c} href={`/search/results?category=${encodeURIComponent(c)}`} className="hero">
                <Cover category={c} />
                <span className="hero-chip">{c}</span>
                <span className="hero-text">
                  <b>{CATEGORY_COPY[c].hook}</b>
                  <span>{`${countLabel(c, counts.get(c)!)} near ${place}`}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="section-head">
            <h2>Top rated near you</h2>
            <Link href="/search/results">See all</Link>
          </div>
          <div className="scroller">
            {topRated.map((p) => (
              <ProviderCard key={p.id} provider={p} showCategory />
            ))}
          </div>

          {latest.length > 0 && (
            <>
              <div className="section-head">
                <h2>Latest from neighbours</h2>
              </div>
              <div className="feed">
                {latest.map(({ review, provider }) => (
                  <Link key={review.id} href={`/provider/${provider.id}`} className="feed-item">
                    <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{initialsOf(review.author)}</span>
                    <span style={{ minWidth: 0 }}>
                      <b>{review.author}</b> reviewed <b>{provider.name}</b>
                      <span className="sub">{`${review.text ? `${review.text} · ` : ""}${timeAgo(new Date(review.date).getTime())}`}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
