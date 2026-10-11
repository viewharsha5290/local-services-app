"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Palette, Search, SearchX, User } from "lucide-react";
import { ProviderCard } from "@/components/ProviderCard";
import { Cover } from "@/components/Cover";
import { PostCard } from "@/components/PostCard";
import { StarPicker } from "@/components/Stars";
import { ThemeSheet } from "@/components/ThemePicker";
import { useSheet } from "@/components/SheetProvider";
import { useApp } from "@/lib/store";
import { Category, ListingPost, Provider } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { CategoryIcon } from "@/lib/categoryIcons";
import { countLabel } from "@/lib/categories";
import { useRequireAuth } from "@/lib/useActions";
import { HOME_BATCH, SORTS, SortKey, getHomeShown, getHomeSort, setHomeShown, setHomeSort } from "@/lib/homeSort";

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

const PER_CATEGORY = 4;
const time = (iso: string) => new Date(iso).getTime();

export default function SearchHomePage() {
  const { auth, providers, categories, pendingFollowUp, resolveFollowUp, locationLabel, fetchRecentPosts } = useApp();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { open } = useSheet();
  const [query, setQuery] = useState("");
  const [recentPosts, setRecentPosts] = useState<ListingPost[]>([]);
  const [sort, setSort] = useState<SortKey>(getHomeSort);
  const [shown, setShown] = useState(getHomeShown);
  const sentinel = useRef<HTMLDivElement>(null);

  function chooseSort(key: SortKey) {
    setHomeSort(key);
    setSort(key);
    setHomeShown(HOME_BATCH);
    setShown(HOME_BATCH);
  }

  useEffect(() => {
    let active = true;
    fetchRecentPosts().then((list) => active && setRecentPosts(list));
    return () => {
      active = false;
    };
  }, [fetchRecentPosts]);

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

  // A trade with nobody listed near here is left off the page: tapping it would lead nowhere.
  const listed = useMemo(() => categories.filter((c) => counts.get(c.name)), [categories, counts]);
  const heroes = [...listed].sort((a, b) => counts.get(b.name)! - counts.get(a.name)!);
  // Distance needs the visitor's position; listings without coordinates of their own go last.
  const hasDistance = providers.some((p) => p.distanceKm != null);
  const sorted = useMemo(() => {
    const order: Record<SortKey, (a: Provider, b: Provider) => number> = {
      active: (a, b) => time(b.activityAt) - time(a.activityAt),
      rated: (a, b) => rankScore(b) - rankScore(a),
      near: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      new: (a, b) => time(b.createdAt) - time(a.createdAt),
      category: (a, b) => time(b.activityAt) - time(a.activityAt),
    };
    return [...providers].sort(order[sort]);
  }, [providers, sort]);
  const byCategory = sort === "category";
  const hasMore = !byCategory && shown < sorted.length;
  // Each trade's most recently active few, in the same order as the strip of trades above.
  const sections = useMemo(
    () => (byCategory ? listed.map((c) => ({ category: c, top: sorted.filter((p) => p.category === c.name).slice(0, PER_CATEGORY) })) : []),
    [byCategory, listed, sorted]
  );

  // Loads the next batch when the end of the grid comes near the bottom of the screen. Watching
  // afresh after each batch means a tall screen keeps filling until the marker is out of view.
  useEffect(() => {
    const marker = sentinel.current;
    if (!marker || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setHomeShown(getHomeShown() + HOME_BATCH);
        setShown(getHomeShown());
      },
      { rootMargin: "300px" }
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasMore, shown, sort]);
  const noteFor = (p: Provider) => (sort === "active" ? `Updated ${timeAgo(time(p.activityAt))}` : sort === "new" ? `Added ${timeAgo(time(p.createdAt))}` : undefined);
  // Updates from businesses listed near here, at most two per business so one shop can't fill the row.
  const newThisWeek = useMemo(() => {
    const byId = new Map(providers.map((p) => [p.id, p]));
    const perBusiness = new Map<string, number>();
    return recentPosts
      .filter((post) => {
        if (!byId.has(post.providerId)) return false;
        const n = (perBusiness.get(post.providerId) ?? 0) + 1;
        perBusiness.set(post.providerId, n);
        return n <= 2;
      })
      .slice(0, 12)
      .map((post) => ({ post, provider: byId.get(post.providerId)! }));
  }, [recentPosts, providers]);

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
        {listed.map((c) => (
          <button key={c.name} type="button" className="trade" onClick={() => router.push(`/search/results?category=${encodeURIComponent(c.name)}`)}>
            <CategoryIcon icon={c.icon} size={24} />
            {c.name}
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
              <Link key={c.name} href={`/search/results?category=${encodeURIComponent(c.name)}`} className="hero">
                <Cover art={c.art} />
                <span className="hero-chip">{c.name}</span>
                <span className="hero-text">
                  <b>{c.hook}</b>
                  <span>{`${countLabel(c, counts.get(c.name)!)} near ${place}`}</span>
                </span>
              </Link>
            ))}
          </div>

          {newThisWeek.length > 0 && (
            <>
              <div className="section-head">
                <h2>New this week</h2>
              </div>
              <div className="scroller">
                {newThisWeek.map(({ post, provider }) => (
                  <Link key={post.id} href={`/provider/${provider.id}`} className="postlink" aria-label={`${provider.name}: ${post.caption}`}>
                    <PostCard post={post} businessName={provider.name} />
                  </Link>
                ))}
              </div>
            </>
          )}

          {latest.length > 0 && (
            <>
              <div className="section-head">
                <h2>Latest from neighbours</h2>
              </div>
              <div className="feed">
                {latest.map(({ review, provider }) => (
                  <Link key={review.id} href={`/provider/${provider.id}`} className="feed-item">
                    <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{review.anonymous ? <User size={19} /> : initialsOf(review.author)}</span>
                    <span style={{ minWidth: 0 }}>
                      <b>{review.author}</b> reviewed <b>{provider.name}</b>
                      <span className="sub">{`${review.text ? `${review.text} · ` : ""}${timeAgo(new Date(review.date).getTime())}`}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="section-head">
            <h2>{`Around ${place}`}</h2>
            <Link href="/search/results">See all</Link>
          </div>
          <div className="chip-row" role="group" aria-label="Order listings by" style={{ marginBottom: 12 }}>
            {SORTS.map((option) => (
              <button key={option.key} type="button" className={`chip ${sort === option.key ? "on" : ""}`} aria-pressed={sort === option.key} onClick={() => chooseSort(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          {sort === "near" && !hasDistance ? (
            <p className="sortnote">
              To order by distance we need to know where you are. <Link href="/onboarding?change=1">Add your postal code or share your location</Link>.
            </p>
          ) : byCategory ? (
            sections.map(({ category, top }) => (
              <section key={category.name} className="catsection" aria-label={category.name}>
                <div className="cat-head">
                  <h3>
                    <CategoryIcon icon={category.icon} size={20} />
                    {category.name}
                  </h3>
                  {counts.get(category.name)! > top.length && (
                    <Link href={`/search/results?category=${encodeURIComponent(category.name)}`}>{`See all ${counts.get(category.name)}`}</Link>
                  )}
                </div>
                <div className="cardgrid">
                  {top.map((p) => (
                    <ProviderCard key={p.id} provider={p} note={noteFor(p)} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <>
              {sort === "rated" && <p className="sortnote">Neighbour ratings come first, then ratings from Google.</p>}
              <div className="cardgrid">
                {sorted.slice(0, shown).map((p) => (
                  <ProviderCard key={p.id} provider={p} showCategory note={noteFor(p)} />
                ))}
              </div>
              {hasMore ? (
                <div ref={sentinel} className="cardgrid-end" role="status">
                  Loading more…
                </div>
              ) : (
                <div className="cardgrid-end">{`That’s all ${sorted.length} near ${place}.`}</div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
