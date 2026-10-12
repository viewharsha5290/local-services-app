"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { TabBar } from "@/components/TabBar";
import { DesktopNav } from "@/components/DesktopNav";
import { AppLoading } from "@/components/AppLoading";
import { Footer } from "@/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, locationLabel } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // A listing is the one page that makes sense without knowing where the visitor is: it is what
  // people are sent a link to, so it opens straight away. Everything else asks for a place first
  // and then carries on to the page that was wanted.
  const onListing = pathname.startsWith("/provider");
  const needsPlace = hydrated && !locationLabel && !onListing;

  useEffect(() => {
    // the address bar, not usePathname, so a search or category in the link comes along too
    if (needsPlace) router.replace(`/onboarding?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [needsPlace, router]);

  if (!hydrated || needsPlace) return <AppLoading />;

  return (
    <>
      <DesktopNav />
      {/* Listings end in their own pinned contact bar instead of the tab bar. */}
      <main className={`app-main ${onListing ? "flush-bottom" : ""}`}>
        {children}
        {/* a listing ends in its own pinned contact bar, and carries its own notice and links */}
        {!onListing && <Footer />}
      </main>
      <TabBar />
    </>
  );
}
