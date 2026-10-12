/** Turns what someone typed for a business's website or social page into the link to store:
 * "instagram.com/name" becomes "https://instagram.com/name", an empty box becomes null. The
 * database applies the same rule (migration 019). */
export function cleanWebsite(input: string): { link: string | null; error?: string } {
  const typed = input.trim();
  if (!typed) return { link: null };
  const link = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(link) || link.length > 300) return { link: null, error: "Enter a full web address, like example.com or instagram.com/yourname." };
  return { link };
}
