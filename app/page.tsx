"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { AppLoading } from "@/components/AppLoading";

export default function RootPage() {
  const { hydrated, locationLabel } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(locationLabel ? "/search" : "/onboarding");
  }, [hydrated, locationLabel, router]);

  return <AppLoading />;
}
