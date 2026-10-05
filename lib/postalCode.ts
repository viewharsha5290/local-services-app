// Canadian postal code: A1A 1A1 (letter-digit-letter space digit-letter-digit).
// The first 3 characters are the FSA (Forward Sortation Area) — a valid, searchable
// unit on their own, e.g. "L8E" without the rest of the code.
const FSA_RE = /^[A-Z]\d[A-Z]$/;
const FULL_RE = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

/** Strips spaces/case, and re-inserts the canonical space for a full 6-character code.
 *  "l8e4a7", "L8E 4A7", "L8E4A7" all normalize to "L8E 4A7"; "l8e" normalizes to "L8E". */
export function normalizePostalCode(input: string): string {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  if (FULL_RE.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  return compact;
}

/** Valid as either a full postal code or just the FSA (first 3 characters) — not a
 *  partial/fuzzy match against any position in the string. */
export function isValidPostalCode(input: string): boolean {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  return FSA_RE.test(compact) || FULL_RE.test(compact);
}

/** The FSA (first 3 characters) — the unit "search" should key off for partial codes. */
export function postalCodeFsa(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase().slice(0, 3);
}
