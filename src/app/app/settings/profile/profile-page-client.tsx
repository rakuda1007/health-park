"use client";

import { useAuth } from "@/contexts/auth-context";
import { appPath } from "@/lib/app-paths";
import Link from "next/link";

export function ProfilePageClient() {
  const { ready, user, signOut } = useAuth();
  const signedInWithEmail = Boolean(user && !user.isAnonymous);

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-[color:var(--hp-muted)]">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        プロフィール
      </h1>

      {signedInWithEmail ? (
        <section className="mt-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <p className="text-sm text-[color:var(--hp-muted)]">ログイン中のアカウント</p>
          <p className="mt-2 break-all text-sm font-medium text-[color:var(--hp-foreground)]">
            {user?.email ?? "メールアドレス不明"}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-[color:var(--hp-border)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-surface)]"
            >
              ログアウト
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <p className="text-sm text-[color:var(--hp-muted)]">
            現在は未ログインです。クラウド同期を利用する場合はログインしてください。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`${appPath("/login")}?redirect=${encodeURIComponent(appPath("/settings/profile"))}`}
              className="rounded-md border border-[color:var(--hp-border)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-surface)]"
            >
              ログイン
            </Link>
            <Link
              href={`${appPath("/login")}?redirect=${encodeURIComponent(appPath("/settings/profile"))}&mode=signup`}
              className="rounded-md bg-[color:var(--hp-signup)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-signup-fg)] transition-opacity hover:opacity-90"
            >
              新規登録
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
