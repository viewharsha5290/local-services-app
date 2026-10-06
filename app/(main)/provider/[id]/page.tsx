"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, Check, ChevronLeft, Clock, ExternalLink, Heart, MapPin, MessageSquare, Phone, Share2, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ListingCover } from "@/components/Cover";
import { GoogleRating, Stars } from "@/components/Stars";
import { ClaimStatus, GoogleReview, ListingStats, Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useRequireAuth } from "@/lib/useActions";
import { useSheet } from "@/components/SheetProvider";
import { ContactSheet } from "@/components/sheets/ContactSheet";
import { timeAgo } from "@/lib/time";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function cityNames(cities: string[]) {
  return cities.map((c) => c.split(",")[0]);
}

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

  const saved = isSaved(provider.id);
  const serves = cityNames(provider.cities);
  const hasGoogle = provider.googleRating != null && Boolean(provider.googleRatingCount);
  const writeReview = () => requireAuth({ type: "review", providerId: provider.id });

  return (
    <div className="listing">
      <div className="listing-hero">
        <ListingCover provider={provider} />
        <button type="button" className="float-btn" style={{ left: 16 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <button type="button" className="float-btn" style={{ right: 70 }} onClick={share} aria-label="Share this listing">
          {shared ? <Check size={19} /> : <Share2 size={19} />}
        </button>
        <button
          type="button"
          className={`float-btn ${saved ? "on" : ""}`}
          style={{ right: 16 }}
          aria-label={saved ? "Remove from saved" : "Save this listing"}
          aria-pressed={saved}
          onClick={() => requireAuth({ type: "save", providerId: provider.id })}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        {provider.photos.length === 0 && <span className="art-note">Illustration, not a photo</span>}
      </div>

      <div className="listing-body">
        <h1>{provider.name}</h1>
        <div className="listing-sub">{`${provider.category}${provider.areaNote ? ` in ${provider.areaNote}` : serves.length ? ` in ${serves[0]}` : ""}`}</div>
        {provider.verified && (
          <div className="listing-tags">
            <span className="tag tag-accent" style={{ gap: 4 }}>
              <ShieldCheck size={13} /> Verified
            </span>
          </div>
        )}

        <div className="statstrip">
          <div>
            {provider.reviewCount > 0 ? (
              <>
                <div className="n">{provider.rating.toFixed(1)}</div>
                <div className="l">{`from ${provider.reviewCount} ${provider.reviewCount === 1 ? "neighbour" : "neighbours"}`}</div>
              </>
            ) : provider.recommendCount > 0 ? (
              <>
                <div className="n">{provider.recommendCount}</div>
                <div className="l">{provider.recommendCount === 1 ? "neighbour recommends" : "neighbours recommend"}</div>
              </>
            ) : (
              <>
                <div className="n">New</div>
                <div className="l">to neighbours</div>
              </>
            )}
          </div>
          {hasGoogle && (
            <>
              <div>
                <div className="n">{provider.googleRating!.toFixed(1)}</div>
                <div className="l">on Google</div>
              </div>
              <div>
                <div className="n">{provider.googleRatingCount!.toLocaleString()}</div>
                <div className="l">Google reviews</div>
              </div>
            </>
          )}
        </div>

        <div className="listing-block">
          {provider.claimed && (
            <div className="inforow" style={{ alignItems: "center" }}>
              <span className="avatar" style={{ width: 48, height: 48 }}>{initialsOf(provider.name)}</span>
              <span>
                <b>Managed by the business</b>
                <br />
                <span className="sub">Claimed and confirmed by The Local Services</span>
              </span>
            </div>
          )}
          <div className="inforow">
            <MapPin size={24} />
            <span>
              <b>{serves.length ? `Works in ${serves.slice(0, 3).join(", ")}${serves.length > 3 ? ` and ${serves.length - 3} more` : ""}` : "Local to you"}</b>
              {(provider.areaNote || provider.distanceKm != null) && (
                <>
                  <br />
                  <span className="sub">{[provider.distanceKm != null ? `${provider.distanceKm} km from you` : null, provider.areaNote].filter(Boolean).join(" · ")}</span>
                </>
              )}
            </span>
          </div>
          {provider.respondsWithin && (
            <div className="inforow">
              <Clock size={24} />
              <span>
                <b>{`Usually responds within ${provider.respondsWithin}`}</b>
              </span>
            </div>
          )}
          <div className="inforow">
            <ShieldCheck size={24} />
            <span>
              <b>Free to contact</b>
              <br />
              <span className="sub">Call or message them directly. We never take a cut.</span>
            </span>
          </div>
        </div>

        {provider.bio && (
          <div className="listing-section">
            <h2>About</h2>
            <p style={{ fontSize: 15 }}>{provider.bio}</p>
          </div>
        )}

        {provider.photos.length > 0 && (
          <div className="listing-section">
            <h2>Their work</h2>
            <WorkPhotos name={provider.name} photos={provider.photos} onOpen={(i) => open(<PhotoViewer name={provider.name} photos={provider.photos} start={i} />)} />
          </div>
        )}

        {isOwner && <OwnerStatsCard stats={myListings.find((l) => l.providerId === provider.id)} />}

        <div className="listing-section">
          <h2>What neighbours say</h2>
          {provider.reviews.length === 0 ? (
            <div className="note-card">
              No neighbour has reviewed them yet. Hired them? One line from you helps the whole street.
              <br />
              <button type="button" className="link" onClick={writeReview}>
                {`Review ${provider.name}`}
              </button>
            </div>
          ) : (
            <>
              <div>
                {provider.reviews.map((r) => (
                  <div key={r.id} className="review">
                    <span className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initialsOf(r.author)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span className="who">{r.author}</span>
                        <span className="when">{timeAgo(new Date(r.date).getTime())}</span>
                      </div>
                      <Stars rating={r.rating} size={13} />
                      <div className="body">{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={writeReview}>
                Write a review
              </button>
            </>
          )}
        </div>

        <GoogleReviewsSection provider={provider} />

        <ClaimRow
          provider={provider}
          isOwner={isOwner}
          claimStatus={myClaims[provider.id]}
          onClaim={() => requireAuth({ type: "claim", providerId: provider.id })}
        />
      </div>

      <div className="contactbar">
        <div style={{ minWidth: 0 }}>
          <div className="t">Free to contact</div>
          <div className="s">{provider.phoneDisplay}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-icon" style={{ width: 54, height: 54 }} aria-label={`Message ${provider.name}`} onClick={() => open(<ContactSheet provider={provider} />)}>
            <MessageSquare size={20} />
          </button>
          <button type="button" className="btn btn-cta" onClick={callNow}>
            <Phone size={18} /> Call
          </button>
        </div>
      </div>
    </div>
  );
}

/** Up to three photos in a one-big-two-small block; the last tile says how many more there are. */
function WorkPhotos({ name, photos, onOpen }: { name: string; photos: string[]; onOpen: (index: number) => void }) {
  const shown = photos.slice(0, 3);
  const more = photos.length - shown.length;
  return (
    <div className={`workgrid n${shown.length}`}>
      {shown.map((src, i) => (
        <button key={src} type="button" onClick={() => onOpen(i)} aria-label={`Open photo ${i + 1} of ${photos.length} of ${name}'s work`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
          <img src={src} alt="" loading="lazy" />
          {i === shown.length - 1 && more > 0 && <span className="more">{`+${more} more`}</span>}
        </button>
      ))}
    </div>
  );
}

/** Every photo, full width, in a sheet that opens scrolled to the one that was tapped. */
function PhotoViewer({ name, photos, start }: { name: string; photos: string[]; start: number }) {
  return (
    <>
      <h3 style={{ marginBottom: 12 }}>{`${name}: their work`}</h3>
      <div className="photostack">
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage
          <img
            key={src}
            src={src}
            alt={`${name} work photo ${i + 1} of ${photos.length}`}
            ref={i === start && start > 0 ? (el) => el?.scrollIntoView({ block: "start" }) : undefined}
          />
        ))}
      </div>
    </>
  );
}

/** Shown only to the business that manages the listing: what the site has sent them. */
function OwnerStatsCard({ stats }: { stats?: ListingStats }) {
  const since = stats?.countingSince
    ? new Date(stats.countingSince).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const n = stats?.last30Days ?? 0;
  return (
    <div className="listing-section">
      <h2>Your listing</h2>
      <div className="card">
        <div className="eyebrow">Only you see this</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 44, lineHeight: 1, color: "var(--color-brand-ink)" }}>{n}</span>
          <span style={{ fontSize: 14 }}>{n === 1 ? "contact" : "contacts"} in the last 30 days</span>
        </div>
        <div className="statstrip" style={{ marginTop: 10, border: 0, borderTop: "1px solid var(--color-line)", borderRadius: 0, paddingBottom: 4 }}>
          <OwnerStat value={stats?.calls30Days ?? 0} label="Calls" />
          <OwnerStat value={stats?.whatsapp30Days ?? 0} label="WhatsApp" />
          <OwnerStat value={stats?.sms30Days ?? 0} label="SMS" />
          <OwnerStat value={stats?.allTime ?? 0} label="All time" />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
          {`Counts taps on Call, WhatsApp and SMS from this page${since ? `, since ${since}` : ""}. A tap isn't always a completed call.`}
        </div>
      </div>
    </div>
  );
}

function OwnerStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="n">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

/** Where a business starts (or follows) a claim on its own listing. Deliberately low-key and at
 * the bottom of the page — it is for the business, not for the neighbours browsing. */
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <BadgeCheck size={15} color="var(--color-brand-ink)" /> You manage this listing.
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
  return <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "28px 0 0", textAlign: "center" }}>{content}</p>;
}

/** Kept visually and structurally apart from neighbour reviews: these are strangers' Google Maps
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
    <div className="listing-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>From Google</h2>
        <GoogleRating provider={provider} />
      </div>
      <p style={{ fontSize: 13.5, color: "var(--color-muted)", margin: "0 0 4px" }}>
        Public reviews from Google Maps. They aren&rsquo;t neighbour recommendations and don&rsquo;t count toward the neighbour rating.
      </p>
      {reviews === null ? (
        <p style={{ fontSize: 14, color: "var(--color-muted)" }}>Loading…</p>
      ) : (
        <div>
          {reviews.map((r) => (
            <div key={r.id} className="review">
              {r.authorPhotoUri ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar; next/image would need a domain allowlist
                <img src={r.authorPhotoUri} alt="" width={40} height={40} referrerPolicy="no-referrer" style={{ borderRadius: "50%", flex: "none" }} />
              ) : (
                <span className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{r.author[0]}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  {r.authorUri ? (
                    <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="who">
                      {r.author}
                    </a>
                  ) : (
                    <span className="who">{r.author}</span>
                  )}
                  {r.date && <span className="when">{timeAgo(new Date(r.date).getTime())}</span>}
                </div>
                <Stars rating={r.rating} size={13} />
                {r.text && <div className="body">{r.text}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {provider.googleMapsUri && (
        <a href={provider.googleMapsUri} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-block" style={{ marginTop: 12 }}>
          See all {provider.googleRatingCount ? provider.googleRatingCount.toLocaleString() : ""} reviews on Google Maps <ExternalLink size={15} />
        </a>
      )}
    </div>
  );
}
