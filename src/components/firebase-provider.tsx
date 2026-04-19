"use client";

import { isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { useEffect, type ReactNode } from "react";

/**
 * Firebase が設定されているときだけ匿名ログインし、
 * Firestore / Storage のバックアップで uid を使えるようにする。
 */
export function FirebaseProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }
    void ensureAnonymousUser().catch((err) => {
      console.error("[Health Park] Firebase 匿名ログインに失敗しました", err);
    });
  }, []);

  return <>{children}</>;
}
