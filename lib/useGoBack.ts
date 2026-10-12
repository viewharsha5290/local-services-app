"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** What a page's Back button does. Someone who opened a shared link has nothing on this site to
 * go back to, so they are taken to the home page instead of being left where they are (or sent
 * off the site). */
export function useGoBack(fallback = "/search") {
  const router = useRouter();
  return useCallback(() => {
    // The Navigation API knows whether an earlier page on this site is in the tab's history;
    // without it, a history of more than one entry is the best available hint.
    const nav = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
    const canGoBack = typeof nav?.canGoBack === "boolean" ? nav.canGoBack : window.history.length > 1;
    if (canGoBack) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
