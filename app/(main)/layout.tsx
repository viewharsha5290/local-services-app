"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { TabBar } from "@/components/TabBar";
import { DesktopNav } from "@/components/DesktopNav";
import { AppLoading } from "@/components/AppLoading";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, locationLabel } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !locationLabel) router.replace("/onboarding");
  }, [hydrated, locationLabel, router]);

  if (!hydrated || !locationLabel) return <AppLoading />;

  return (
    <>
      <DesktopNav />
      <main className="app-main">{children}</main>
      <TabBar />
    </>
  );
}
