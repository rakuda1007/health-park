"use client";

import { useAuth } from "@/contexts/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { ready, signIn, signUp, user } = useAuth();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect") ?? "/backup";

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setBusy(true);
      try {
        if (mode === "signin") {
          await signIn(email, password);
        } else {
          await signUp(email, password);
        }
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setBusy(false);
      }
    },
    [email, password, mode, signIn, signUp, router, redirectTo],
  );

  if (!isFirebaseConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
          ログイン
        </h1>
        <p className="mt-4 text-sm text-[color:var(--hp-muted)]">
          Firebase が未設定です。プロジェクト直下に{" "}
          <code className="rounded bg-[color:var(--hp-surface)] px-1 py-0.5 text-xs">
            .env.local
          </code>{" "}
          を作成してください。
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[color:var(--hp-accent)] underline"
        >
          ホームへ
        </Link>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="text-sm text-[color:var(--hp-muted)]">読み込み中…</p>
      </main>
    );
  }

  if (user && !user.isAnonymous) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
          ログイン済み
        </h1>
        <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
          {user.email ?? user.uid} としてサインインしています。
        </p>
        <Link
          href={redirectTo}
          className="mt-6 inline-block rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)]"
        >
          バックアップへ進む
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        {mode === "signin" ? "ログイン" : "新規登録"}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
        クラウドへのバックアップ・復元には、メールアドレスとパスワードでの認証が必要です。
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="hp-email"
            className="block text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            メールアドレス
          </label>
          <input
            id="hp-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-sm text-[color:var(--hp-foreground)]"
          />
        </div>
        <div>
          <label
            htmlFor="hp-password"
            className="block text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            パスワード
          </label>
          <input
            id="hp-password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-2 text-sm text-[color:var(--hp-foreground)]"
          />
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            6文字以上（Firebase の要件）
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
        >
          {busy ? "処理中…" : mode === "signin" ? "ログイン" : "登録する"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[color:var(--hp-muted)]">
        {mode === "signin" ? (
          <>
            アカウントをお持ちでないですか？{" "}
            <button
              type="button"
              className="text-[color:var(--hp-accent)] underline"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              新規登録
            </button>
          </>
        ) : (
          <>
            既にアカウントがありますか？{" "}
            <button
              type="button"
              className="text-[color:var(--hp-accent)] underline"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              ログイン
            </button>
          </>
        )}
      </p>

      <div className="mt-8 border-t border-[color:var(--hp-border)] pt-6">
        <Link
          href="/backup"
          className="text-sm text-[color:var(--hp-muted)] underline-offset-4 hover:text-[color:var(--hp-accent)] hover:underline"
        >
          ← バックアップへ戻る
        </Link>
      </div>
    </main>
  );
}
