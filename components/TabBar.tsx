"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CirclePlus, Search, User } from "lucide-react";
import { useRequireAuth } from "@/lib/useActions";

export function TabBar() {
  const pathname = usePathname();
  const requireAuth = useRequireAuth();

  const isSearch = pathname.startsWith("/search") || pathname.startsWith("/provider");
  const isSaved = pathname.startsWith("/saved");
  const isProfile = pathname.startsWith("/profile");

  return (
    <nav className="tabbar">
      <Link href="/search" className={`tabitem ${isSearch ? "active" : ""}`}>
        <Search />
        Search
      </Link>
      <Link href="/saved" className={`tabitem ${isSaved ? "active" : ""}`}>
        <Bookmark />
        Saved
      </Link>
      <button type="button" className="tabitem" onClick={() => requireAuth({ type: "recommend" })}>
        <CirclePlus />
        Recommend
      </button>
      <Link href="/profile" className={`tabitem ${isProfile ? "active" : ""}`}>
        <User />
        Profile
      </Link>
    </nav>
  );
}
