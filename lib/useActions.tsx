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
  const { auth, toggleSaved, getProvider } = useApp();
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
        // One review per neighbour: someone who already wrote one gets it back to edit.
        const mine = auth.id ? provider?.reviews.find((r) => r.authorId === auth.id) : undefined;
        if (provider) open(<WriteReviewSheet provider={provider} review={mine} />);
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
    [auth.id, toggleSaved, getProvider, open]
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
