"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CirclePlus, Search, User } from "lucide-react";
import { useRequireAuth } from "@/lib/useActions";

export function DesktopNav() {
  const pathname = usePathname();
  const requireAuth = useRequireAuth();

  const isSearch = pathname.startsWith("/search") || pathname.startsWith("/provider");
  const isSaved = pathname.startsWith("/saved");
  const isProfile = pathname.startsWith("/profile");

  return (
    <nav className="desktopnav">
      <Link href="/search" className="desktopnav-brand">
        Local
      </Link>
      <div className="desktopnav-links">
        <Link href="/search" className={`desktopnav-link ${isSearch ? "active" : ""}`}>
          <Search /> Search
        </Link>
        <Link href="/saved" className={`desktopnav-link ${isSaved ? "active" : ""}`}>
          <Bookmark /> Saved
        </Link>
        <button type="button" className="desktopnav-link" onClick={() => requireAuth({ type: "recommend" })}>
          <CirclePlus /> Recommend
        </button>
        <Link href="/profile" className={`desktopnav-link ${isProfile ? "active" : ""}`}>
          <User /> Profile
        </Link>
      </div>
    </nav>
  );
}
