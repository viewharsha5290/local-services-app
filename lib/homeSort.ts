/** How the home page orders its listings. The choice is kept for the visit, so coming back from a
 * listing doesn't reset it. */
export type SortKey = "active" | "rated" | "near" | "new" | "category";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "active", label: "Recently active" },
  { key: "rated", label: "Top rated" },
  { key: "near", label: "Nearby" },
  { key: "new", label: "Newest" },
  // not an order but a different view: a short section for each trade
  { key: "category", label: "By category" },
];

let current: SortKey = "active";

export const getHomeSort = () => current;

export function setHomeSort(key: SortKey) {
  current = key;
}

/** How many listings the grid loads at a time, and how far this visit has scrolled into it. */
export const HOME_BATCH = 8;
let shown = HOME_BATCH;

export const getHomeShown = () => shown;

export function setHomeShown(count: number) {
  shown = count;
}
