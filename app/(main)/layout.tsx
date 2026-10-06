"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { TabBar } from "@/components/TabBar";
import { DesktopNav } from "@/components/DesktopNav";
import { AppLoading } from "@/components/AppLoading";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, locationLabel } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !locationLabel) router.replace("/onboarding");
  }, [hydrated, locationLabel, router]);

  if (!hydrated || !locationLabel) return <AppLoading />;

  return (
    <>
      <DesktopNav />
      {/* Listings end in their own pinned contact bar instead of the tab bar. */}
      <main className={`app-main ${pathname.startsWith("/provider") ? "flush-bottom" : ""}`}>{children}</main>
      <TabBar />
    </>
  );
}
