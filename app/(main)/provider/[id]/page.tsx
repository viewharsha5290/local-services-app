"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, Bookmark, Check, ExternalLink, Phone, Share2, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { GoogleRating, Stars } from "@/components/Stars";
import { ClaimStatus, GoogleReview, ListingStats, Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useRequireAuth } from "@/lib/useActions";
import { useSheet } from "@/components/SheetProvider";
import { ContactSheet } from "@/components/sheets/ContactSheet";
import { CategoryIcon } from "@/lib/categoryIcons";
import { timeAgo } from "@/lib/time";
import { formatLocationMeta } from "@/lib/format";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { auth, getProvider, isSaved, logContact, myClaims, myListings, refreshMyListings } = useApp();
  const requireAuth = useRequireAuth();
  const { open } = useSheet();
  const [shared, setShared] = useState(false);

  const provider = getProvider(params.id);
  const isOwner = Boolean(auth.id) && provider?.ownerId === auth.id;

  // Owners come here to see how the listing is doing, so fetch fresh counts on arrival.
  useEffect(() => {
    if (isOwner) refreshMyListings();
  }, [isOwner, refreshMyListings]);

  if (!provider) {
    return (
      <>
        <TopBar back title="Not found" />
        <p style={{ marginTop: 16 }}>This provider doesn&rsquo;t exist.</p>
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/search")}>
          Back to search
        </button>
      </>
    );
  }

  function callNow() {
    logContact(provider!.id, provider!.name, "call");
    window.location.href = `tel:${provider!.phone}`;
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: provider!.name, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    }
  }

  return (
    <>
      <TopBar back title={provider.name} />
      <div className="content-narrow" style={{ paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-accent-100)",
              color: "var(--color-accent-700)",
              border: "1px solid var(--color-divider)",
            }}
          >
            <CategoryIcon category={provider.category} size={21} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-meta" style={{ marginBottom: 6, fontSize: 12 }}>
              {provider.category}
              {formatLocationMeta(provider) ? ` · ${formatLocationMeta(provider)}` : ""}
            </div>
            <h2 style={{ margin: "0 0 6px" }}>{provider.name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {provider.verified && (
                <span className="tag tag-accent" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <ShieldCheck size={11} /> Verified
                </span>
              )}
              {provider.claimed && (
                <span className="tag tag-outline" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <BadgeCheck size={11} /> Claimed by business
                </span>
              )}
              {provider.reviewCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <Stars rating={provider.rating} size={14} />
                  <span style={{ opacity: 0.75 }}>
                    {provider.rating.toFixed(1)} ({provider.reviewCount})
                  </span>
                </span>
              )}
              {provider.recommendCount > 0 && (
                <span style={{ fontSize: 12, opacity: 0.75 }}>Recommended by {provider.recommendCount} neighbors</span>
              )}
              <GoogleRating provider={provider} />
            </div>
          </div>
        </div>

        {provider.bio && <p style={{ fontSize: 13.5, opacity: 0.85, marginBottom: 16 }}>{provider.bio}</p>}

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={callNow}>
            <Phone size={14} /> Call
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => open(<ContactSheet provider={provider} />)}>
            Message
          </button>
          <button
            type="button"
            className={`btn btn-icon ${isSaved(provider.id) ? "btn-primary" : "btn-secondary"}`}
            aria-label="Save provider"
            onClick={() => requireAuth({ type: "save", providerId: provider.id })}
          >
            <Bookmark size={16} fill={isSaved(provider.id) ? "currentColor" : "none"} />
          </button>
          <button type="button" className="btn btn-icon btn-secondary" aria-label="Share provider" onClick={share}>
            {shared ? <Check size={16} /> : <Share2 size={16} />}
          </button>
        </div>

        {isOwner && <OwnerStatsCard stats={myListings.find((l) => l.providerId === provider.id)} />}

        <div className="hr" />

        <div className="section-label" style={{ margin: "14px 0 4px" }}>
          Reviews ({provider.reviewCount})
        </div>
        {provider.reviews.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>No reviews yet. Be the first to share how it went.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
            {provider.reviews.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, padding: "14px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flex: "none" }}>
                  {r.author
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.author}</span>
                    <span style={{ fontSize: 11, color: "var(--color-neutral-500)", flex: "none" }}>{timeAgo(new Date(r.date).getTime())}</span>
                  </div>
                  <Stars rating={r.rating} size={11} />
                  <div className="card-body" style={{ marginTop: 4 }}>{r.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-ghost btn-block" style={{ margin: "16px 0" }} onClick={() => requireAuth({ type: "review", providerId: provider.id })}>
          Write a review
        </button>

        <GoogleReviewsSection provider={provider} />

        <ClaimRow
          provider={provider}
          isOwner={isOwner}
          claimStatus={myClaims[provider.id]}
          onClaim={() => requireAuth({ type: "claim", providerId: provider.id })}
        />
      </div>
    </>
  );
}

/** Shown only to the business that manages the listing: what the site has sent them. */
function OwnerStatsCard({ stats }: { stats?: ListingStats }) {
  const since = stats?.countingSince
    ? new Date(stats.countingSince).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <div className="card blueprint" style={{ marginBottom: 18 }}>
      <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      <div className="section-label" style={{ marginBottom: 2 }}>Your listing · only you see this</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1 }}>{stats?.last30Days ?? 0}</span>
        <span style={{ fontSize: 13 }}>{(stats?.last30Days ?? 0) === 1 ? "contact" : "contacts"} in the last 30 days</span>
      </div>
      <div style={{ display: "flex", textAlign: "center", marginTop: 10, borderTop: "1px solid var(--color-divider)", paddingTop: 10 }}>
        <OwnerStat value={stats?.calls30Days ?? 0} label="Calls" />
        <OwnerStat value={stats?.whatsapp30Days ?? 0} label="WhatsApp" border />
        <OwnerStat value={stats?.sms30Days ?? 0} label="SMS" border />
        <OwnerStat value={stats?.allTime ?? 0} label="All time" border />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 10 }}>
        {`Counts taps on Call, WhatsApp and SMS from this page${since ? `, since ${since}` : ""}. A tap isn't always a completed call.`}
      </div>
    </div>
  );
}

function OwnerStat({ value, label, border }: { value: number; label: string; border?: boolean }) {
  return (
    <div style={{ flex: 1, borderLeft: border ? "1px solid var(--color-divider)" : undefined }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>{label}</div>
    </div>
  );
}

/** Where a business starts (or follows) a claim on its own listing. Deliberately low-key and at
 * the bottom of the page — it is for the business, not for the neighbors browsing. */
function ClaimRow({
  provider,
  isOwner,
  claimStatus,
  onClaim,
}: {
  provider: Provider;
  isOwner: boolean;
  claimStatus?: ClaimStatus;
  onClaim: () => void;
}) {
  let content: React.ReactNode;
  if (isOwner) {
    content = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <BadgeCheck size={13} color="var(--color-accent-700)" /> You manage this listing.
      </span>
    );
  } else if (provider.ownerId) {
    return null; // someone else manages it — nothing to offer
  } else if (claimStatus === "pending") {
    content = "Your claim on this listing is being reviewed. We'll confirm it with the business first.";
  } else if (claimStatus === "rejected") {
    content = "Your claim on this listing wasn't approved.";
  } else {
    content = (
      <>
        Is this your business?{" "}
        <button type="button" className="btn btn-ghost" style={{ padding: 0, display: "inline", minHeight: 0, fontSize: "inherit" }} onClick={onClaim}>
          Claim this listing
        </button>
      </>
    );
  }
  return (
    <>
      <div className="hr" />
      <p style={{ fontSize: 12.5, color: "var(--color-neutral-600)", margin: "14px 0 20px", textAlign: "center" }}>{content}</p>
    </>
  );
}

/** Kept visually and structurally apart from neighbor reviews: these are strangers' Google Maps
 * reviews (at most the 5 Google chooses to return), attributed to their authors as Google requires. */
function GoogleReviewsSection({ provider }: { provider: Provider }) {
  const { fetchGoogleReviews } = useApp();
  const [reviews, setReviews] = useState<GoogleReview[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchGoogleReviews(provider.id).then((r) => active && setReviews(r));
    return () => {
      active = false;
    };
  }, [provider.id, fetchGoogleReviews]);

  if (!provider.googleRatingCount && !reviews?.length) return null;

  return (
    <>
      <div className="hr" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, margin: "14px 0 4px" }}>
        <div className="section-label">From Google</div>
        <GoogleRating provider={provider} />
      </div>
      <p style={{ fontSize: 12, color: "var(--color-neutral-500)", margin: "0 0 4px" }}>
        Public reviews from Google Maps — not neighbor recommendations, and not counted in the rating above.
      </p>
      {reviews === null ? (
        <p style={{ fontSize: 13, opacity: 0.7 }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, padding: "14px 0", borderBottom: "1px solid var(--color-divider)" }}>
              {r.authorPhotoUri ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar; next/image would need a domain allowlist
                <img src={r.authorPhotoUri} alt="" width={32} height={32} referrerPolicy="no-referrer" style={{ borderRadius: "50%", flex: "none" }} />
              ) : (
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flex: "none" }}>
                  {r.author[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  {r.authorUri ? (
                    <a href={r.authorUri} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500 }}>
                      {r.author}
                    </a>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.author}</span>
                  )}
                  {r.date && <span style={{ fontSize: 11, color: "var(--color-neutral-500)", flex: "none" }}>{timeAgo(new Date(r.date).getTime())}</span>}
                </div>
                <Stars rating={r.rating} size={11} />
                {r.text && <div className="card-body" style={{ marginTop: 4 }}>{r.text}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {provider.googleMapsUri && (
        <a href={provider.googleMapsUri} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block" style={{ margin: "16px 0" }}>
          See all {provider.googleRatingCount ? provider.googleRatingCount.toLocaleString() : ""} reviews on Google Maps <ExternalLink size={13} />
        </a>
      )}
    </>
  );
}
