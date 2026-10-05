export type Category = "Handyman" | "Mechanic" | "Attorney" | "Auditor" | "Clergy" | "Electrician";

export const CATEGORIES: Category[] = ["Handyman", "Mechanic", "Attorney", "Auditor", "Clergy", "Electrician"];

export interface Review {
  id: string;
  providerId: string;
  author: string;
  authorId?: string;
  rating: number;
  tags: string[];
  text: string;
  date: string;
  mine?: boolean;
}

/** A review imported from Google Maps — deliberately a separate type from `Review` so it can
 * never be counted toward the neighbor rating or rendered as a neighbor's recommendation. */
export interface GoogleReview {
  id: string;
  author: string;
  authorUri?: string;
  authorPhotoUri?: string;
  rating: number;
  text: string;
  date?: string;
  mapsUri?: string;
}

export interface Provider {
  id: string;
  name: string;
  category: Category;
  /** Only known when both the provider and the current user have coordinates — see lib/distance.ts. */
  distanceKm?: number;
  lat?: number;
  lng?: number;
  rating: number;
  reviewCount: number;
  recommendCount: number;
  verified: boolean;
  claimed: boolean;
  phone: string;
  phoneDisplay: string;
  areaNote?: string;
  respondsWithin?: string;
  bio?: string;
  /** Cities this provider offers service in — a provider can be based in one city but serve several. */
  cities: string[];
  reviews: Review[];
  addedByUser?: boolean;
  /** Google's own aggregate — shown beside, never merged into, `rating`/`reviewCount`. */
  googleRating?: number;
  googleRatingCount?: number;
  googleMapsUri?: string;
}

export type ContactMethod = "whatsapp" | "sms" | "call" | "chat";

export interface ContactEvent {
  id: string;
  providerId: string;
  providerName: string;
  method: ContactMethod;
  timestamp: number;
  followUpAt: number;
  resolved: boolean;
}

export type PendingAction =
  | { type: "save"; providerId: string }
  | { type: "review"; providerId: string }
  | { type: "recommend" }
  | null;

export interface AuthState {
  status: "guest" | "signedIn";
  id?: string;
  name?: string;
  email?: string;
}
