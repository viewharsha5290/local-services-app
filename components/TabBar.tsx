"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, Heart, Search, User } from "lucide-react";
import { useRequireAuth } from "@/lib/useActions";
import { useTheme } from "@/lib/useTheme";

export function TabBar() {
  const pathname = usePathname();
  const requireAuth = useRequireAuth();
  const { info } = useTheme();

  // A listing has its own contact bar pinned to the bottom, so the tabs step aside there.
  if (pathname.startsWith("/provider")) return null;

  const isSearch = pathname.startsWith("/search");
  const isSaved = pathname.startsWith("/saved");
  const isProfile = pathname.startsWith("/profile");

  return (
    <nav className="tabbar" aria-label="Main">
      <Link href="/search" className={`tabitem ${isSearch ? "active" : ""}`} aria-current={isSearch ? "page" : undefined}>
        <Search />
        Explore
      </Link>
      <Link href="/saved" className={`tabitem ${isSaved ? "active" : ""}`} aria-current={isSaved ? "page" : undefined}>
        <Heart />
        Saved
      </Link>
      <button type="button" className="tabitem" onClick={() => requireAuth({ type: "recommend" })}>
        <CirclePlus />
        {info.recommendWord}
      </button>
      <Link href="/profile" className={`tabitem ${isProfile ? "active" : ""}`} aria-current={isProfile ? "page" : undefined}>
        <User />
        You
      </Link>
    </nav>
  );
}
