"use client";

import { useCallback } from "react";
import { useApp } from "./store";
import { useSheet } from "@/components/SheetProvider";
import { WriteReviewSheet } from "@/components/sheets/WriteReviewSheet";
import { RecommendSheet } from "@/components/sheets/RecommendSheet";
import { AuthGateSheet } from "@/components/sheets/AuthGateSheet";
import { ClaimSheet } from "@/components/sheets/ClaimSheet";
import { PendingAction } from "./types";

export function useActionResolver() {
  const { toggleSaved, getProvider } = useApp();
  const { open } = useSheet();

  return useCallback(
    (action: PendingAction) => {
      if (!action) return;
      if (action.type === "save") {
        toggleSaved(action.providerId);
        return;
      }
      if (action.type === "review") {
        const provider = getProvider(action.providerId);
        if (provider) open(<WriteReviewSheet provider={provider} />);
        return;
      }
      if (action.type === "recommend") {
        open(<RecommendSheet />);
        return;
      }
      if (action.type === "claim") {
        const provider = getProvider(action.providerId);
        // Someone else may have been approved while this user was signing in.
        if (provider && !provider.ownerId) open(<ClaimSheet provider={provider} />);
      }
    },
    [toggleSaved, getProvider, open]
  );
}

export function useRequireAuth() {
  const { auth, setPendingAction } = useApp();
  const { open } = useSheet();
  const resolve = useActionResolver();

  return useCallback(
    (action: NonNullable<PendingAction>) => {
      if (auth.status === "signedIn") {
        resolve(action);
        return;
      }
      setPendingAction(action);
      open(<AuthGateSheet reason={action.type} />);
    },
    [auth.status, resolve, setPendingAction, open]
  );
}
