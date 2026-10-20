/** How the home page orders its listings. The choice is kept for the visit, so coming back from a
 * listing doesn't reset it. */
export type SortKey = "active" | "rated" | "near" | "new" | "category";

export const SORTS: { key: SortKey; label: string }[] = [
  // not an order but a different view: a short section for each trade. The default, now that
  // every trade has enough listings to fill its section.
  { key: "category", label: "By category" },
  { key: "active", label: "Recently active" },
  { key: "rated", label: "Top rated" },
  { key: "near", label: "Nearby" },
  { key: "new", label: "Newest" },
];

let current: SortKey = "category";

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
