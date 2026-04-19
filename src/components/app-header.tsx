"use client";

import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

const nav = [
  { href: "/", label: "ホーム" },
  { href: "/weight", label: "体重" },
  { href: "/steps", label: "歩数" },
  { href: "/blood-pressure", label: "血圧" },
  { href: "/prescriptions", label: "処方箋" },
  { href: "/meals", label: "食事" },
  { href: "/clinics", label: "通院先" },
  { href: "/backup", label: "バックアップ" },
] as const;

export function AppHeader() {
  const { user, signOut } = useAuth();
  const signedInWithEmail = Boolean(user && !user.isAnonymous);

  return (
    <header className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-surface)]">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href="/"
          className="font-semibold tracking-tight text-[color:var(--hp-foreground)]"
        >
          Health Park
        </Link>
        <nav
          className="flex min-w-0 flex-1 flex-wrap justify-end gap-x-3 gap-y-1 text-sm"
          aria-label="主要ナビゲーション"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[color:var(--hp-muted)] underline-offset-4 hover:text-[color:var(--hp-accent)] hover:underline"
            >
              {item.label}
            </Link>
          ))}
          {signedInWithEmail ? (
            <span className="flex flex-wrap items-center gap-2 border-l border-[color:var(--hp-border)] pl-3 text-xs text-[color:var(--hp-muted)]">
              <span className="max-w-[10rem] truncate" title={user?.email ?? ""}>
                {user?.email ?? ""}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-[color:var(--hp-border)] px-2 py-1 text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-card)]"
              >
                ログアウト
              </button>
            </span>
          ) : (
            <Link
              href="/login?redirect=/backup"
              className="border-l border-[color:var(--hp-border)] pl-3 text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
