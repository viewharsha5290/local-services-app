"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, Heart, Palette, Search, User } from "lucide-react";
import { useRequireAuth } from "@/lib/useActions";
import { useTheme } from "@/lib/useTheme";
import { BrandMark } from "./BrandMark";
import { useSheet } from "./SheetProvider";
import { ThemeSheet } from "./ThemePicker";

export function DesktopNav() {
  const pathname = usePathname();
  const requireAuth = useRequireAuth();
  const { open } = useSheet();
  const { info } = useTheme();

  const isSearch = pathname.startsWith("/search") || pathname.startsWith("/provider");
  const isSaved = pathname.startsWith("/saved");
  const isProfile = pathname.startsWith("/profile");

  return (
    <nav className="desktopnav" aria-label="Main">
      <Link href="/search" className="brand desktopnav-brand">
        <BrandMark />
        The Local Services
      </Link>
      <div className="desktopnav-links">
        <Link href="/search" className={`desktopnav-link ${isSearch ? "active" : ""}`}>
          <Search /> Explore
        </Link>
        <Link href="/saved" className={`desktopnav-link ${isSaved ? "active" : ""}`}>
          <Heart /> Saved
        </Link>
        <button type="button" className="desktopnav-link" onClick={() => requireAuth({ type: "recommend" })}>
          <CirclePlus /> {info.recommendWord}
        </button>
        <button type="button" className="desktopnav-link" onClick={() => open(<ThemeSheet />)}>
          <Palette /> Theme
        </button>
        <Link href="/profile" className={`desktopnav-link ${isProfile ? "active" : ""}`}>
          <User /> You
        </Link>
      </div>
    </nav>
  );
}
