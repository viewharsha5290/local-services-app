import { CategoryInfo } from "./types";

/** The trades the site launched with. The live list comes from the `categories` table (see
 * lib/store.tsx); these stand in until it has loaded, or if it can't be reached. */
export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { name: "Handyman", one: "handyman", many: "handymen", hook: "That fix you keep putting off?", icon: "hammer", art: "house", sortOrder: 10 },
  { name: "Mechanic", one: "mechanic", many: "mechanics", hook: "Car making that noise?", icon: "wrench", art: "garage", sortOrder: 20 },
  { name: "Attorney", one: "attorney", many: "attorneys", hook: "Need it in writing?", icon: "scale", art: "columns", sortOrder: 30 },
  { name: "Auditor", one: "auditor", many: "auditors", hook: "Books need a second look?", icon: "calculator", art: "towers", sortOrder: 40 },
  { name: "Priests & Temples", one: "priest or temple", many: "priests and temples", hook: "Planning a ceremony?", icon: "church", art: "hall", sortOrder: 50 },
  { name: "Electrician", one: "electrician", many: "electricians", hook: "Lights flickering?", icon: "zap", art: "lights", sortOrder: 60 },
];

/** A listing whose trade isn't in the list (renamed a moment ago, say) still gets sensible words. */
export function findCategory(categories: CategoryInfo[], name: string): CategoryInfo {
  return (
    categories.find((c) => c.name === name) ?? {
      name,
      one: name.toLowerCase(),
      many: name.toLowerCase(),
      hook: `Looking for ${name.toLowerCase()}?`,
      icon: "briefcase",
      art: "shop",
      sortOrder: 1000,
    }
  );
}

export function countLabel(category: CategoryInfo, n: number) {
  return `${n} ${n === 1 ? category.one : category.many}`;
}

/** The illustrations a category can use as its cover (drawn in components/Cover.tsx). */
export const ART_OPTIONS: { key: string; label: string }[] = [
  { key: "house", label: "House and ladder" },
  { key: "garage", label: "Garage and car" },
  { key: "lights", label: "Houses at night" },
  { key: "columns", label: "Columned building" },
  { key: "towers", label: "Office towers" },
  { key: "hall", label: "Hall with lamps" },
  { key: "shop", label: "Shopfronts" },
  { key: "van", label: "Work van" },
  { key: "garden", label: "Garden and trees" },
];
