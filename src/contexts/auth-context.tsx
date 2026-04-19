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
