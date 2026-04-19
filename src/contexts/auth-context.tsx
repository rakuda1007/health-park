"use client";

import {
  formatAuthError,
  signInWithEmailPassword,
  signOutUser,
  signUpWithEmailPassword,
} from "@/lib/firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AuthContextValue = {
  /** Firebase 未設定のとき false */
  firebaseConfigured: boolean;
  /** onAuthStateChanged の初回コールバックまで false */
  ready: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const firebaseConfigured = isFirebaseConfigured();
  const remoteSyncUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setReady(true);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, [firebaseConfigured]);

  /** メールログイン後: クラウドとマージ → リアルタイム購読（ログアウトで解除） */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- uid / isAnonymous でログイン状態を表す
  useEffect(() => {
    remoteSyncUnsub.current?.();
    remoteSyncUnsub.current = null;
    if (!firebaseConfigured || !ready) {
      return;
    }
    if (!user || user.isAnonymous) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const m = await import("@/lib/sync/incremental-cloud-sync");
        await m.mergeCloudWithLocal();
        if (cancelled) {
          return;
        }
        remoteSyncUnsub.current = m.startRemoteSync(user.uid);
      } catch (e) {
        console.error("[Health Park] クラウド同期の初期化に失敗しました", e);
      }
    })();
    return () => {
      cancelled = true;
      remoteSyncUnsub.current?.();
      remoteSyncUnsub.current = null;
    };
  }, [firebaseConfigured, ready, user?.uid, user?.isAnonymous]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailPassword(email, password);
    } catch (e: unknown) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      throw new Error(code ? formatAuthError(code) : "ログインに失敗しました。");
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      await signUpWithEmailPassword(email, password);
    } catch (e: unknown) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      throw new Error(code ? formatAuthError(code) : "登録に失敗しました。");
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const value = useMemo(
    () => ({
      firebaseConfigured,
      ready,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [firebaseConfigured, ready, user, signIn, signUp, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider 内で使ってください。");
  }
  return ctx;
}
