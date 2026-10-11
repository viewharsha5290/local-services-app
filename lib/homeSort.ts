/** How the home page orders its listings. The choice is kept for the visit, so coming back from a
 * listing doesn't reset it. */
export type SortKey = "active" | "rated" | "near" | "new";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "active", label: "Recently active" },
  { key: "rated", label: "Top rated" },
  { key: "near", label: "Nearby" },
  { key: "new", label: "Newest" },
];

let current: SortKey = "active";

export const getHomeSort = () => current;

export function setHomeSort(key: SortKey) {
  current = key;
}
