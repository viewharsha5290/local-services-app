import { Category } from "./types";

/** Friendly wording for each trade: the short tab label, how to count them, and the question a
 * neighbour is usually asking when they need one. */
export const CATEGORY_COPY: Record<Category, { tab: string; one: string; many: string; hook: string }> = {
  Electrician: { tab: "Electric", one: "electrician", many: "electricians", hook: "Lights flickering?" },
  Mechanic: { tab: "Cars", one: "mechanic", many: "mechanics", hook: "Car making that noise?" },
  Handyman: { tab: "Home fixes", one: "handyman", many: "handymen", hook: "That fix you keep putting off?" },
  Attorney: { tab: "Legal", one: "attorney", many: "attorneys", hook: "Need it in writing?" },
  Auditor: { tab: "Money", one: "auditor", many: "auditors", hook: "Books need a second look?" },
  Clergy: { tab: "Faith", one: "priest", many: "priests and clergy", hook: "Planning a ceremony?" },
};

export function countLabel(category: Category, n: number) {
  const c = CATEGORY_COPY[category];
  return `${n} ${n === 1 ? c.one : c.many}`;
}
