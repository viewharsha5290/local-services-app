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

  useEffect(() => {
    if (hydrated && !locationLabel) router.replace("/onboarding");
  }, [hydrated, locationLabel, router]);

  if (!hydrated || !locationLabel) return <AppLoading />;
  const onListing = pathname.startsWith("/provider");

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
