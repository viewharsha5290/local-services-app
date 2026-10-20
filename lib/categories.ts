import { CategoryInfo } from "./types";

/** The trades the site launched with. The live list comes from the `categories` table (see
 * lib/store.tsx); these stand in until it has loaded, or if it can't be reached. */
export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { name: "Handyman", one: "handyman", many: "handymen", hook: "That fix you keep putting off?", icon: "hammer", art: "toolbox", sortOrder: 10 },
  { name: "Mechanic", one: "mechanic", many: "mechanics", hook: "Car making that noise?", icon: "wrench", art: "car", sortOrder: 20 },
  { name: "Attorney", one: "attorney", many: "attorneys", hook: "Need it in writing?", icon: "scale", art: "scales", sortOrder: 30 },
  { name: "Auditor", one: "auditor", many: "auditors", hook: "Books need a second look?", icon: "calculator", art: "calculator", sortOrder: 40 },
  { name: "Priests & Places of Worship", one: "priest or place of worship", many: "priests and places of worship", hook: "Planning a ceremony?", icon: "church", art: "candle", sortOrder: 50 },
  { name: "Electrician", one: "electrician", many: "electricians", hook: "Lights flickering?", icon: "zap", art: "bulb", sortOrder: 60 },
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
      art: "saree",
      sortOrder: 1000,
    }
  );
}

export function countLabel(category: CategoryInfo, n: number) {
  return `${n} ${n === 1 ? category.one : category.many}`;
}

/** The illustrations a category can use as its cover (drawn in components/Cover.tsx). */
export const ART_OPTIONS: { key: string; label: string }[] = [
  { key: "toolbox", label: "Toolbox" },
  { key: "roller", label: "Paint roller" },
  { key: "car", label: "Car and wrench" },
  { key: "scales", label: "Scales" },
  { key: "calculator", label: "Calculator and ledger" },
  { key: "housekey", label: "House and key" },
  { key: "candle", label: "Candle" },
  { key: "tiffin", label: "Tiffin carrier" },
  { key: "spray", label: "Spray bottle" },
  { key: "tire", label: "Winter tire" },
  { key: "shovel", label: "Snow shovel and grass" },
  { key: "diya", label: "Diya lamp" },
  { key: "garland", label: "Marigold garland" },
  { key: "bulb", label: "Light bulb" },
  { key: "tap", label: "Dripping tap" },
  { key: "cake", label: "Tiered cake" },
  { key: "henna", label: "Henna hand" },
  { key: "tent", label: "Canopy tent" },
  { key: "saree", label: "Saree on a dress form" },
  { key: "book", label: "Book and bell" },
  { key: "sewing", label: "Sewing machine" },
  { key: "lplate", label: "Learner's car" },
  { key: "toran", label: "Door toran" },
  { key: "knee", label: "Sore knee" },
];
