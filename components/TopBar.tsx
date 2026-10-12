"use client";

import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { useApp } from "@/lib/store";
import { useGoBack } from "@/lib/useGoBack";

interface TopBarProps {
  back?: boolean;
  title?: string;
  subtitle?: string;
  location?: boolean;
}

export function TopBar({ back, title, subtitle, location }: TopBarProps) {
  const goBack = useGoBack();
  const { locationLabel } = useApp();

  return (
    <div className="topbar">
      {back && (
        <button type="button" className="topbar-back" onClick={goBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
      )}
      {location ? (
        <Link href="/onboarding?change=1" className="topbar-location">
          <MapPin size={12} />
          {locationLabel ?? "Set location"} · Change
        </Link>
      ) : (
        <div className="topbar-title">
          <div className="t">{title}</div>
          {subtitle && <div className="s">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
