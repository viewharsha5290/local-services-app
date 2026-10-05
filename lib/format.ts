import { Provider } from "./types";

/** distanceKm is only known once both the provider and the current user have coordinates. */
export function formatLocationMeta(provider: Pick<Provider, "distanceKm" | "areaNote">): string | null {
  if (provider.distanceKm != null) return `${provider.distanceKm} km${provider.areaNote ? ` · ${provider.areaNote}` : ""}`;
  return provider.areaNote ?? null;
}
