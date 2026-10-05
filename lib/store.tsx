"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { haversineKm } from "./distance";
import { AuthState, ContactEvent, ContactMethod, GoogleReview, PendingAction, Provider, Review } from "./types";

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
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => void;
  toggleSaved: (providerId: string) => void;
  isSaved: (providerId: string) => boolean;
  addReview: (input: ReviewInput) => void;
  addRecommendation: (input: RecommendInput) => Promise<string>;
  logContact: (providerId: string, providerName: string, method: ContactMethod) => void;
  resolveFollowUp: (eventId: string, action: "hired" | "not-hired" | "snooze", rating?: number) => void;
  pendingFollowUp: ContactEvent | null;
  setPendingAction: (action: PendingAction) => void;
  consumePendingAction: () => PendingAction;
  getProvider: (id: string) => Provider | undefined;
  /** Loaded per provider page rather than with the list — ~5 per provider adds up fast. */
  fetchGoogleReviews: (providerId: string) => Promise<GoogleReview[]>;
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
      author: r.author_name,
      authorId: r.author_id ?? undefined,
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

async function fetchProfileName(userId: string, email?: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  if (data?.name) return data.name;
  // The DB trigger that creates the profile row runs asynchronously right after signup —
  // give it one retry before falling back to a client-side default.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const retry = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return retry.data?.name ?? email?.split("@")[0] ?? "Neighbor";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [local, setLocal] = useState<LocalState>(defaultLocal);
  const [auth, setAuth] = useState<AuthState>({ status: "guest" });
  const [providersBase, setProvidersBase] = useState<Provider[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [trustStats, setTrustStats] = useState<TrustStats>(defaultTrustStats);

  const fetchProviders = useCallback(async (cityFilter?: string | null) => {
    let query = supabase.from("providers").select("*, reviews(*)").order("created_at", { ascending: true });
    // Built by hand rather than `.contains("cities", [cityFilter])`: supabase-js serializes that
    // as an unquoted `{Toronto, ON}`, which Postgres parses as two elements and never matches.
    if (cityFilter) query = query.filter("cities", "cs", `{"${cityFilter.replace(/["\\]/g, "\\$&")}"}`);
    const { data, error } = await query;
    if (!error && data) setProvidersBase(data.map(mapProviderRow));
  }, []);

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

  const loadSignedInExtras = useCallback(
    async (userId: string) => {
      await Promise.all([fetchSaved(userId), fetchContactEvents(userId), fetchTrustStats(userId)]);
    },
    [fetchSaved, fetchContactEvents, fetchTrustStats]
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
      if (session?.user && active) {
        const name = await fetchProfileName(session.user.id, session.user.email ?? undefined);
        if (active) {
          setAuth({ status: "signedIn", id: session.user.id, name, email: session.user.email ?? undefined });
          await loadSignedInExtras(session.user.id);
        }
      }

      await fetchProviders(initialLocal.locationScope === "city" ? initialLocal.city : null);
      if (active) setHydrated(true);
    }
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setAuth({ status: "guest" });
        setSavedIds([]);
        setContactEvents([]);
        setTrustStats(defaultTrustStats);
      } else if (event === "SIGNED_IN" && session?.user) {
        const name = await fetchProfileName(session.user.id, session.user.email ?? undefined);
        setAuth({ status: "signedIn", id: session.user.id, name, email: session.user.email ?? undefined });
        await loadSignedInExtras(session.user.id);
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

  const signInWithEmail = useCallback(async (email: string) => {
    // The email carries a sign-in link (and, once the template includes it, a 6-digit code).
    // The link returns to the verify page, which resumes the pending action for both paths.
    const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/verify` : undefined;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo } });
    return { error: error?.message };
  }, []);

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) return { error: error.message };
      if (data.session?.user) {
        const name = await fetchProfileName(data.session.user.id, data.session.user.email ?? undefined);
        setAuth({ status: "signedIn", id: data.session.user.id, name, email: data.session.user.email ?? undefined });
        await loadSignedInExtras(data.session.user.id);
      }
      return {};
    },
    [loadSignedInExtras]
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

  const addReview = useCallback(
    async (input: ReviewInput) => {
      if (auth.status !== "signedIn" || !auth.id) return;
      const authorName = auth.name ?? "Neighbor";
      const { data } = await supabase
        .from("reviews")
        .insert({ provider_id: input.providerId, author_id: auth.id, author_name: authorName, rating: input.rating, tags: input.tags, text: input.text })
        .select()
        .single();
      if (!data) return;
      const review: Review = { id: data.id, providerId: input.providerId, author: authorName, authorId: auth.id, rating: input.rating, tags: input.tags, text: input.text, date: data.created_at };
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
    addRecommendation,
    logContact,
    resolveFollowUp,
    pendingFollowUp,
    setPendingAction,
    consumePendingAction,
    getProvider,
    fetchGoogleReviews,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
