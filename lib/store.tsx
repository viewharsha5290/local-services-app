"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { haversineKm } from "./distance";
import { PHOTO_BUCKET, photoPath, photoUrl, prepareImage } from "./photos";
import { AuthState, ClaimStatus, ContactEvent, ContactMethod, GoogleReview, ListingStats, PendingAction, PendingClaim, Provider, Review } from "./types";

const LOCAL_KEY = "lsapp_local_v3";
// ~2 days in production. (Was a 20s demo delay before the real backend existed.)
const FOLLOW_UP_DELAY_MS = 1000 * 60 * 60 * 48;

interface RecommendInput {
  name: string;
  category: Provider["category"];
  phone: string;
  rating: number;
  note: string;
}

interface ReviewInput {
  providerId: string;
  rating: number;
  tags: string[];
  text: string;
  /** Show the review as "A neighbour" instead of under the author's name. */
  anonymous?: boolean;
}

export interface ListingInput {
  bio: string;
  phone: string;
  areaNote: string;
  cities: string[];
  respondsWithin: string | null;
}

/** The listing functions raise messages written for the person editing; anything else is ours. */
function listingError(message: string | undefined, fallback: string) {
  return message && /^(Enter|The |Choose|Invalid|Not authorized|A listing|Sign in|Duplicate|Unknown)/.test(message) ? `${message}.`.replace(/\.\.$/, ".") : fallback;
}

/** What stands in for the name on a review posted without one. */
export const ANONYMOUS_AUTHOR = "A neighbour";

interface ClaimInput {
  providerId: string;
  roleTitle: string;
  contactPhone: string;
  note: string;
}

interface Coords {
  lat: number;
  lng: number;
}

/** Things that stay device-local rather than moving to the database: a casual location
 * preference, the in-flight "resume this after sign-in" action, and (for guests only,
 * since contact_events requires an authenticated row owner) the follow-up log. */
interface LocalState {
  postalCode: string | null;
  city: string | null;
  locationScope: "postal" | "city";
  pendingAction: PendingAction;
  userCoords: Coords | null;
  guestContactEvents: ContactEvent[];
}

const defaultLocal: LocalState = {
  postalCode: null,
  city: null,
  locationScope: "postal",
  pendingAction: null,
  userCoords: null,
  guestContactEvents: [],
};

interface SetLocationInput {
  scope: "postal" | "city";
  postalCode?: string;
  city?: string;
  coords?: Coords;
}

interface TrustStats {
  recommendations: number;
  reviews: number;
  neighborsHelped: number;
  isTrusted: boolean;
}

const defaultTrustStats: TrustStats = { recommendations: 0, reviews: 0, neighborsHelped: 0, isTrusted: false };

interface AppContextValue {
  hydrated: boolean;
  postalCode: string | null;
  city: string | null;
  locationScope: "postal" | "city";
  /** What to show in the location pill/subtitle: the city when scope is city, else the postal code. */
  locationLabel: string | null;
  auth: AuthState;
  providers: Provider[];
  savedIds: string[];
  contactEvents: ContactEvent[];
  pendingAction: PendingAction;
  trustStats: TrustStats;
  setLocation: (input: SetLocationInput) => void;
  /** Emails a sign-in link + code. Pass `name` to create an account (sign-up); without it only
   * existing accounts are emailed, and `noAccount` reports that the address isn't registered. */
  signInWithEmail: (email: string, name?: string) => Promise<{ error?: string; noAccount?: boolean }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => void;
  toggleSaved: (providerId: string) => void;
  isSaved: (providerId: string) => boolean;
  addReview: (input: ReviewInput) => void;
  /** Edit or delete one of the signed-in user's own reviews (the database refuses anyone else's). */
  updateReview: (reviewId: string, input: ReviewInput) => Promise<{ error?: string }>;
  deleteReview: (reviewId: string, providerId: string) => Promise<{ error?: string }>;
  addRecommendation: (input: RecommendInput) => Promise<string>;
  logContact: (providerId: string, providerName: string, method: ContactMethod) => void;
  resolveFollowUp: (eventId: string, action: "hired" | "not-hired" | "snooze", rating?: number) => void;
  pendingFollowUp: ContactEvent | null;
  setPendingAction: (action: PendingAction) => void;
  consumePendingAction: () => PendingAction;
  getProvider: (id: string) => Provider | undefined;
  /** Re-reads one listing from the database (adding it if it isn't in the current city's list). */
  refreshProvider: (id: string) => Promise<void>;
  /** Editing a listing: only its manager or an admin gets past the database (migration 011). */
  updateListing: (id: string, input: ListingInput) => Promise<{ error?: string }>;
  addListingPhotos: (id: string, files: File[]) => Promise<{ error?: string }>;
  /** Sets the listing's photos to exactly these URLs, in this order; any left out are deleted. */
  saveListingPhotos: (id: string, urls: string[]) => Promise<{ error?: string }>;
  /** Loaded per provider page rather than with the list — ~5 per provider adds up fast. */
  fetchGoogleReviews: (providerId: string) => Promise<GoogleReview[]>;
  /** The signed-in user's own claims, keyed by provider id. */
  myClaims: Record<string, ClaimStatus>;
  submitClaim: (input: ClaimInput) => Promise<{ error?: string }>;
  /** Admin only — enforced by the database, not by this client. */
  fetchPendingClaims: () => Promise<{ claims: PendingClaim[]; error?: string }>;
  reviewClaim: (claimId: string, approve: boolean) => Promise<{ error?: string }>;
  /** Listings the signed-in user manages, with their contact counts. Empty for everyone else. */
  myListings: ListingStats[];
  refreshMyListings: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Fire-and-forget a write after an optimistic UI update. Supabase query builders are lazy —
 * nothing is sent until they are awaited or `.then`-ed — so a bare call silently does nothing. */
function send(query: PromiseLike<{ error: { message: string } | null }>) {
  query.then(({ error }) => {
    if (error) console.error("Supabase write failed:", error.message);
  });
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProviderRow(row: any): Provider {
  const reviews: Review[] = ((row.reviews ?? []) as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((r) => ({
      id: r.id,
      providerId: r.provider_id,
      author: r.author_name ?? ANONYMOUS_AUTHOR,
      authorId: r.author_id ?? undefined,
      anonymous: Boolean(r.anonymous),
      rating: r.rating,
      tags: r.tags ?? [],
      text: r.text ?? "",
      date: r.created_at,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const reviewCount = reviews.length;
  const rating = reviewCount ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10 : 0;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    rating,
    reviewCount,
    recommendCount: row.recommend_count ?? 0,
    verified: row.verified,
    claimed: row.claimed,
    phone: row.phone ?? "",
    phoneDisplay: row.phone_display ?? row.phone ?? "Not provided",
    areaNote: row.area_note ?? undefined,
    respondsWithin: row.responds_within ?? undefined,
    bio: row.bio ?? undefined,
    cities: row.cities ?? [],
    reviews,
    addedByUser: Boolean(row.added_by),
    googleRating: row.google_rating != null ? Number(row.google_rating) : undefined,
    googleRatingCount: row.google_rating_count ?? undefined,
    googleMapsUri: row.google_maps_uri ?? undefined,
    ownerId: row.owner_id ?? undefined,
    photos: ((row.photos ?? []) as string[]).map(photoUrl),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoogleReviewRow(row: any): GoogleReview {
  return {
    id: row.id,
    author: row.author_name,
    authorUri: row.author_uri ?? undefined,
    authorPhotoUri: row.author_photo_uri ?? undefined,
    rating: row.rating,
    text: row.text ?? "",
    date: row.published_at ?? undefined,
    mapsUri: row.google_maps_uri ?? undefined,
  };
}

function mapContactEventRow(row: {
  id: string;
  provider_id: string;
  provider_name: string;
  method: ContactMethod;
  created_at: string;
  follow_up_at: string;
  resolved: boolean;
}): ContactEvent {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    method: row.method,
    timestamp: new Date(row.created_at).getTime(),
    followUpAt: new Date(row.follow_up_at).getTime(),
    resolved: row.resolved,
  };
}

async function fetchProfile(userId: string, email?: string): Promise<{ name: string; isAdmin: boolean }> {
  const { data } = await supabase.from("profiles").select("name, is_admin").eq("id", userId).maybeSingle();
  if (data?.name) return { name: data.name, isAdmin: Boolean(data.is_admin) };
  // The DB trigger that creates the profile row runs asynchronously right after signup —
  // give it one retry before falling back to a client-side default.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const retry = await supabase.from("profiles").select("name, is_admin").eq("id", userId).maybeSingle();
  return { name: retry.data?.name ?? email?.split("@")[0] ?? "Neighbor", isAdmin: Boolean(retry.data?.is_admin) };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [local, setLocal] = useState<LocalState>(defaultLocal);
  const [auth, setAuth] = useState<AuthState>({ status: "guest" });
  const [providersBase, setProvidersBase] = useState<Provider[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [trustStats, setTrustStats] = useState<TrustStats>(defaultTrustStats);
  const [myClaims, setMyClaims] = useState<Record<string, ClaimStatus>>({});
  const [myListings, setMyListings] = useState<ListingStats[]>([]);

  const fetchProviders = useCallback(async (cityFilter?: string | null) => {
    let query = supabase.from("providers").select("*, reviews:reviews_public(*)").order("created_at", { ascending: true });
    // Built by hand rather than `.contains("cities", [cityFilter])`: supabase-js serializes that
    // as an unquoted `{Toronto, ON}`, which Postgres parses as two elements and never matches.
    if (cityFilter) query = query.filter("cities", "cs", `{"${cityFilter.replace(/["\\]/g, "\\$&")}"}`);
    const { data, error } = await query;
    if (!error && data) setProvidersBase(data.map(mapProviderRow));
  }, []);

  const refreshProvider = useCallback(async (id: string) => {
    const { data } = await supabase.from("providers").select("*, reviews:reviews_public(*)").eq("id", id).maybeSingle();
    if (!data) return;
    const fresh = mapProviderRow(data);
    setProvidersBase((prev) => (prev.some((p) => p.id === id) ? prev.map((p) => (p.id === id ? fresh : p)) : [...prev, fresh]));
  }, []);

  const updateListing = useCallback(
    async (id: string, input: ListingInput) => {
      const { error } = await supabase.rpc("update_my_listing", {
        p_provider_id: id,
        p_bio: input.bio,
        p_phone: input.phone,
        p_area_note: input.areaNote,
        p_cities: input.cities,
        p_responds_within: input.respondsWithin,
      });
      if (error) return { error: listingError(error.message, "Couldn't save your changes. Please try again.") };
      await refreshProvider(id);
      return {};
    },
    [refreshProvider]
  );

  const saveListingPhotos = useCallback(
    async (id: string, urls: string[]) => {
      const paths = urls.map(photoPath);
      const { data: before } = await supabase.from("providers").select("photos").eq("id", id).maybeSingle();
      const { error } = await supabase.rpc("set_my_listing_photos", { p_provider_id: id, p_photos: paths });
      if (error) return { error: listingError(error.message, "Couldn't update your photos. Please try again.") };
      const dropped = ((before?.photos ?? []) as string[]).filter((p) => !paths.includes(p));
      if (dropped.length) await supabase.storage.from(PHOTO_BUCKET).remove(dropped);
      await refreshProvider(id);
      return {};
    },
    [refreshProvider]
  );

  const addListingPhotos = useCallback(
    async (id: string, files: File[]) => {
      const uploaded: string[] = [];
      try {
        for (const file of files) {
          const path = `${id}/${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, await prepareImage(file), { contentType: "image/jpeg", cacheControl: "31536000" });
          if (error) throw new Error(error.message);
          uploaded.push(path);
        }
        const { data: before } = await supabase.from("providers").select("photos").eq("id", id).maybeSingle();
        const { error } = await supabase.rpc("set_my_listing_photos", { p_provider_id: id, p_photos: [...((before?.photos ?? []) as string[]), ...uploaded] });
        if (error) throw new Error(error.message);
      } catch (e) {
        // don't leave files behind that no listing points at
        if (uploaded.length) await supabase.storage.from(PHOTO_BUCKET).remove(uploaded);
        return { error: listingError(e instanceof Error ? e.message : undefined, "Couldn't add those photos. Use JPEG, PNG or WebP files and try again.") };
      }
      await refreshProvider(id);
      return {};
    },
    [refreshProvider]
  );

  const fetchSaved = useCallback(async (userId: string) => {
    const { data } = await supabase.from("saved_providers").select("provider_id").eq("user_id", userId);
    setSavedIds((data ?? []).map((r) => r.provider_id));
  }, []);

  const fetchContactEvents = useCallback(async (userId: string) => {
    const { data } = await supabase.from("contact_events").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setContactEvents((data ?? []).map(mapContactEventRow));
  }, []);

  const fetchTrustStats = useCallback(async (userId: string) => {
    const [{ count: reviewCount }, { count: recommendCount }] = await Promise.all([
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("author_id", userId),
      supabase.from("providers").select("id", { count: "exact", head: true }).eq("added_by", userId),
    ]);
    const reviews = reviewCount ?? 0;
    const recommendations = recommendCount ?? 0;
    setTrustStats({ recommendations, reviews, neighborsHelped: reviews + recommendations, isTrusted: reviews + recommendations >= 3 });
  }, []);

  const fetchMyClaims = useCallback(async (userId: string) => {
    const { data } = await supabase.from("provider_claims").select("provider_id, status").eq("user_id", userId);
    setMyClaims(Object.fromEntries((data ?? []).map((r) => [r.provider_id, r.status as ClaimStatus])));
  }, []);

  const refreshMyListings = useCallback(async () => {
    const { data } = await supabase.rpc("my_listing_stats");
    setMyListings(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((data ?? []) as any[]).map((r) => ({
        providerId: r.provider_id,
        providerName: r.provider_name,
        last30Days: Number(r.total_30d),
        calls30Days: Number(r.calls_30d),
        whatsapp30Days: Number(r.whatsapp_30d),
        sms30Days: Number(r.sms_30d),
        allTime: Number(r.total_all),
        countingSince: r.counting_since ?? undefined,
      }))
    );
  }, []);

  const loadSignedInExtras = useCallback(
    async (userId: string) => {
      await Promise.all([fetchSaved(userId), fetchContactEvents(userId), fetchTrustStats(userId), fetchMyClaims(userId), refreshMyListings()]);
    },
    [fetchSaved, fetchContactEvents, fetchTrustStats, fetchMyClaims, refreshMyListings]
  );

  // The one place a signed-in session is set up, whichever way it arrived (stored session,
  // code entry, or email link). supabase-js re-emits SIGNED_IN for the same user on tab focus
  // and token refresh; re-running this then would refetch the saved list mid-write and clobber
  // an optimistic save/unsave, so repeats for the current user are ignored. The user's data is
  // loaded before auth flips to signed-in, so anything reacting to that sees it complete.
  const sessionUserId = useRef<string | null>(null);
  const establishSession = useCallback(
    async (user: { id: string; email?: string }) => {
      if (sessionUserId.current === user.id) return;
      sessionUserId.current = user.id;
      const [profile] = await Promise.all([fetchProfile(user.id, user.email), loadSignedInExtras(user.id)]);
      if (sessionUserId.current !== user.id) return; // signed out (or switched) while loading
      setAuth({ status: "signedIn", id: user.id, name: profile.name, email: user.email, isAdmin: profile.isAdmin });
    },
    [loadSignedInExtras]
  );

  useEffect(() => {
    let active = true;
    let initialLocal = defaultLocal;

    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        initialLocal = { ...defaultLocal, ...JSON.parse(raw) };
        setLocal(initialLocal);
      }
    } catch {
      /* ignore corrupt storage */
    }

    async function init() {
      if (!isSupabaseConfigured) {
        console.warn("Supabase env vars are not set — see .env.local.example. Running with an empty provider list.");
        if (active) setHydrated(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && active) await establishSession(session.user);

      await fetchProviders(initialLocal.locationScope === "city" ? initialLocal.city : null);
      if (active) setHydrated(true);
    }
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        sessionUserId.current = null;
        setAuth({ status: "guest" });
        setSavedIds([]);
        setContactEvents([]);
        setTrustStats(defaultTrustStats);
        setMyClaims({});
        setMyListings([]);
      } else if (event === "SIGNED_IN" && session?.user) {
        // Deferred: supabase-js holds its auth lock while this callback runs, so making
        // Supabase calls from inside it directly can deadlock.
        const user = session.user;
        setTimeout(() => establishSession(user), 0);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
  }, [local, hydrated]);

  // Re-fetch when the city-wide search target changes. The very first fetch already
  // happened in the init effect above (using the freshly-read local value directly,
  // since this effect can't run before `hydrated` flips true), so this only fires on
  // later changes — i.e. the user picking a different city or switching scope.
  const [didInitialCityFetch, setDidInitialCityFetch] = useState(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!didInitialCityFetch) {
      setDidInitialCityFetch(true);
      return;
    }
    fetchProviders(local.locationScope === "city" ? local.city : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, local.locationScope, local.city]);

  const providers = useMemo(() => {
    if (!local.userCoords) return providersBase;
    const { lat: userLat, lng: userLng } = local.userCoords;
    return providersBase.map((p) => (p.lat != null && p.lng != null ? { ...p, distanceKm: haversineKm(userLat, userLng, p.lat, p.lng) } : p));
  }, [providersBase, local.userCoords]);

  const getProvider = useCallback((id: string) => providers.find((p) => p.id === id), [providers]);

  const fetchGoogleReviews = useCallback(async (providerId: string) => {
    const { data } = await supabase.from("google_reviews").select("*").eq("provider_id", providerId).order("published_at", { ascending: false });
    return (data ?? []).map(mapGoogleReviewRow);
  }, []);

  const setLocation = useCallback((input: SetLocationInput) => {
    setLocal((l) => ({
      ...l,
      locationScope: input.scope,
      postalCode: input.postalCode ?? l.postalCode,
      city: input.city ?? l.city,
      userCoords: input.coords ?? l.userCoords,
    }));
  }, []);

  const submitClaim = useCallback(
    async (input: ClaimInput) => {
      if (auth.status !== "signedIn" || !auth.id) return { error: "Sign in to claim a listing." };
      const { error } = await supabase.from("provider_claims").insert({
        provider_id: input.providerId,
        user_id: auth.id,
        role_title: input.roleTitle,
        contact_phone: input.contactPhone || null,
        note: input.note,
      });
      // 23505 = the unique (provider, user) constraint: they have already claimed this one.
      if (error && error.code !== "23505") return { error: "We couldn't submit your claim. Please try again." };
      setMyClaims((c) => ({ ...c, [input.providerId]: c[input.providerId] ?? "pending" }));
      return {};
    },
    [auth]
  );

  const fetchPendingClaims = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_pending_claims");
    if (error) return { claims: [], error: error.message };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claims: PendingClaim[] = ((data ?? []) as any[]).map((r) => ({
      id: r.claim_id,
      providerId: r.provider_id,
      providerName: r.provider_name,
      providerPhone: r.provider_phone ?? undefined,
      claimantName: r.claimant_name,
      claimantEmail: r.claimant_email,
      roleTitle: r.role_title,
      contactPhone: r.contact_phone ?? undefined,
      note: r.note ?? "",
      createdAt: r.created_at,
    }));
    return { claims };
  }, []);

  const reviewClaim = useCallback(
    async (claimId: string, approve: boolean) => {
      const { error } = await supabase.rpc("review_claim", { claim_id: claimId, approve });
      if (error) return { error: error.message };
      // An approval changes the listing's owner/claimed state.
      if (approve) await fetchProviders(local.locationScope === "city" ? local.city : null);
      return {};
    },
    [fetchProviders, local.locationScope, local.city]
  );

  const signInWithEmail = useCallback(async (email: string, name?: string) => {
    // The email carries a sign-in link (and, once the template includes it, a 6-digit code).
    // The link returns to the verify page, which resumes the pending action for both paths.
    const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/verify` : undefined;
    // `data` becomes the new user's metadata, which the handle_new_user trigger copies into
    // profiles.name. It is ignored for an address that already has an account.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: name ? { shouldCreateUser: true, emailRedirectTo, data: { name } } : { shouldCreateUser: false, emailRedirectTo },
    });
    if (error?.code === "otp_disabled") return { noAccount: true };
    return { error: error?.message };
  }, []);

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) return { error: error.message };
      if (data.session?.user) await establishSession(data.session.user);
      return {};
    },
    [establishSession]
  );

  const signOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  const toggleSaved = useCallback(
    (providerId: string) => {
      if (auth.status !== "signedIn" || !auth.id) return;
      const userId = auth.id;
      const alreadySaved = savedIds.includes(providerId);
      if (alreadySaved) {
        setSavedIds((ids) => ids.filter((id) => id !== providerId));
        send(supabase.from("saved_providers").delete().eq("user_id", userId).eq("provider_id", providerId));
      } else {
        setSavedIds((ids) => [...ids, providerId]);
        send(supabase.from("saved_providers").insert({ user_id: userId, provider_id: providerId }));
      }
    },
    [auth, savedIds]
  );

  const isSaved = useCallback((providerId: string) => savedIds.includes(providerId), [savedIds]);

  /** Swap a provider's review list and re-derive its rating from what's left. */
  const replaceReviews = useCallback((providerId: string, change: (reviews: Review[]) => Review[]) => {
    setProvidersBase((prev) =>
      prev.map((p) => {
        if (p.id !== providerId) return p;
        const reviews = change(p.reviews);
        const reviewCount = reviews.length;
        const rating = reviewCount ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10 : 0;
        return { ...p, reviews, reviewCount, rating };
      })
    );
  }, []);

  const updateReview = useCallback(
    async (reviewId: string, input: ReviewInput) => {
      if (auth.status !== "signedIn" || !auth.id) return { error: "Sign in to edit your review." };
      // .select() so a row the database refused to touch shows up as "nothing changed", not success.
      const { data, error } = await supabase
        .from("reviews")
        .update({ rating: input.rating, tags: input.tags, text: input.text, anonymous: Boolean(input.anonymous) })
        .eq("id", reviewId)
        .eq("author_id", auth.id)
        .select("id");
      if (error || !data?.length) return { error: "Couldn't save your changes. Please try again." };
      replaceReviews(input.providerId, (reviews) => reviews.map((r) => (r.id === reviewId ? { ...r, rating: input.rating, tags: input.tags, text: input.text, anonymous: Boolean(input.anonymous), author: input.anonymous ? ANONYMOUS_AUTHOR : (auth.name ?? "Neighbour") } : r)));
      return {};
    },
    [auth, replaceReviews]
  );

  const deleteReview = useCallback(
    async (reviewId: string, providerId: string) => {
      if (auth.status !== "signedIn" || !auth.id) return { error: "Sign in to delete your review." };
      const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("author_id", auth.id).select("id");
      if (error || !data?.length) return { error: "Couldn't delete your review. Please try again." };
      replaceReviews(providerId, (reviews) => reviews.filter((r) => r.id !== reviewId));
      setTrustStats((s) => {
        const reviews = Math.max(0, s.reviews - 1);
        return { ...s, reviews, neighborsHelped: Math.max(0, s.neighborsHelped - 1), isTrusted: reviews + s.recommendations >= 3 };
      });
      return {};
    },
    [auth, replaceReviews]
  );

  const addReview = useCallback(
    async (input: ReviewInput) => {
      if (auth.status !== "signedIn" || !auth.id) return;
      const authorName = auth.name ?? "Neighbor";
      const { data } = await supabase
        .from("reviews")
        .insert({ provider_id: input.providerId, author_id: auth.id, author_name: authorName, rating: input.rating, tags: input.tags, text: input.text, anonymous: Boolean(input.anonymous) })
        .select()
        .single();
      if (!data) return;
      const review: Review = { id: data.id, providerId: input.providerId, author: input.anonymous ? ANONYMOUS_AUTHOR : authorName, authorId: auth.id, rating: input.rating, tags: input.tags, text: input.text, date: data.created_at, anonymous: Boolean(input.anonymous) };
      setProvidersBase((prev) =>
        prev.map((p) => {
          if (p.id !== input.providerId) return p;
          const reviewCount = p.reviewCount + 1;
          const rating = Math.round(((p.rating * p.reviewCount + input.rating) / reviewCount) * 10) / 10;
          return { ...p, reviews: [review, ...p.reviews], reviewCount, rating };
        })
      );
      setTrustStats((s) => {
        const reviews = s.reviews + 1;
        return { ...s, reviews, neighborsHelped: s.neighborsHelped + 1, isTrusted: reviews + s.recommendations >= 3 };
      });
    },
    [auth]
  );

  const addRecommendation = useCallback(
    async (input: RecommendInput): Promise<string> => {
      if (auth.status !== "signedIn" || !auth.id) return "";
      const authorName = auth.name ?? "Neighbor";
      // Tag it with whatever city the user is currently browsing, so a provider recommended
      // from a city-wide search actually shows up in that search afterward.
      const cities = local.locationScope === "city" && local.city ? [local.city] : [];
      const { data: providerRow } = await supabase
        .from("providers")
        .insert({ name: input.name, category: input.category, phone: input.phone || null, phone_display: input.phone || null, recommend_count: 1, added_by: auth.id, cities })
        .select()
        .single();
      if (!providerRow) return "";
      await supabase.from("reviews").insert({ provider_id: providerRow.id, author_id: auth.id, author_name: authorName, rating: input.rating, tags: [], text: input.note });
      await fetchProviders(local.locationScope === "city" ? local.city : null);
      setTrustStats((s) => {
        const recommendations = s.recommendations + 1;
        return { ...s, recommendations, neighborsHelped: s.neighborsHelped + 1, isTrusted: recommendations + s.reviews >= 3 };
      });
      return providerRow.id;
    },
    [auth, fetchProviders, local.locationScope, local.city]
  );

  const logContact = useCallback(
    async (providerId: string, providerName: string, method: ContactMethod) => {
      // Anonymous per-listing tally (guests included) that the listing's owner can see. Separate
      // from the private follow-up log below, which exists to nudge this user for a review.
      send(supabase.rpc("log_provider_contact", { p_provider_id: providerId, p_method: method }));
      const now = Date.now();
      const followUpAt = now + FOLLOW_UP_DELAY_MS;
      if (auth.status === "signedIn" && auth.id) {
        const { data } = await supabase
          .from("contact_events")
          .insert({ user_id: auth.id, provider_id: providerId, provider_name: providerName, method, follow_up_at: new Date(followUpAt).toISOString() })
          .select()
          .single();
        if (data) setContactEvents((prev) => [mapContactEventRow(data), ...prev]);
      } else {
        const event: ContactEvent = { id: uid("evt"), providerId, providerName, method, timestamp: now, followUpAt, resolved: false };
        setLocal((l) => ({ ...l, guestContactEvents: [event, ...l.guestContactEvents] }));
      }
    },
    [auth]
  );

  const resolveFollowUp = useCallback(
    (eventId: string, action: "hired" | "not-hired" | "snooze", rating?: number) => {
      const guestEvent = local.guestContactEvents.find((e) => e.id === eventId);
      const nextFollowUpAt = Date.now() + FOLLOW_UP_DELAY_MS;

      if (guestEvent) {
        setLocal((l) => ({
          ...l,
          guestContactEvents: l.guestContactEvents.map((e) => (e.id !== eventId ? e : action === "snooze" ? { ...e, followUpAt: nextFollowUpAt } : { ...e, resolved: true })),
        }));
        return;
      }

      setContactEvents((prev) => prev.map((e) => (e.id !== eventId ? e : action === "snooze" ? { ...e, followUpAt: nextFollowUpAt } : { ...e, resolved: true })));
      if (action === "snooze") {
        send(supabase.from("contact_events").update({ follow_up_at: new Date(nextFollowUpAt).toISOString() }).eq("id", eventId));
      } else {
        send(supabase.from("contact_events").update({ resolved: true }).eq("id", eventId));
      }
      if (action === "hired" && rating) {
        const event = contactEvents.find((e) => e.id === eventId);
        if (event) addReview({ providerId: event.providerId, rating, tags: [], text: "" });
      }
    },
    [local.guestContactEvents, contactEvents, addReview]
  );

  const setPendingAction = useCallback((action: PendingAction) => {
    setLocal((l) => ({ ...l, pendingAction: action }));
  }, []);

  const consumePendingAction = useCallback((): PendingAction => {
    const action = local.pendingAction;
    setLocal((l) => ({ ...l, pendingAction: null }));
    return action;
  }, [local.pendingAction]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  const pendingFollowUp = useMemo(() => {
    const all = [...contactEvents, ...local.guestContactEvents];
    const due = all.filter((e) => !e.resolved && e.followUpAt <= now).sort((a, b) => b.timestamp - a.timestamp);
    return due[0] ?? null;
  }, [contactEvents, local.guestContactEvents, now]);

  const value: AppContextValue = {
    hydrated,
    postalCode: local.postalCode,
    city: local.city,
    locationScope: local.locationScope,
    locationLabel: local.locationScope === "city" ? local.city : local.postalCode,
    auth,
    providers,
    savedIds,
    contactEvents,
    pendingAction: local.pendingAction,
    trustStats,
    setLocation,
    signInWithEmail,
    verifyEmailCode,
    signOut,
    toggleSaved,
    isSaved,
    addReview,
    updateReview,
    deleteReview,
    addRecommendation,
    logContact,
    resolveFollowUp,
    pendingFollowUp,
    setPendingAction,
    consumePendingAction,
    getProvider,
    refreshProvider,
    updateListing,
    addListingPhotos,
    saveListingPhotos,
    fetchGoogleReviews,
    myClaims,
    submitClaim,
    fetchPendingClaims,
    reviewClaim,
    myListings,
    refreshMyListings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
