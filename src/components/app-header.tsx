"use client";

import { useAuth } from "@/contexts/auth-context";
import { APP_BASE, appPath } from "@/lib/app-paths";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

const recordLinks = [
  { href: appPath("/weight"), label: "体重" },
  { href: appPath("/steps"), label: "歩数" },
  { href: appPath("/blood-pressure"), label: "血圧" },
  { href: appPath("/meals"), label: "食事" },
  { href: appPath("/reflection"), label: "振り返り" },
] as const;

const healthInfoLinks = [
  { href: appPath("/clinics"), label: "病院" },
  { href: appPath("/appointments"), label: "通院予定" },
  { href: appPath("/prescriptions"), label: "処方箋" },
  { href: appPath("/medical-history"), label: "既往歴" },
] as const;

function NavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="text-[color:var(--hp-muted)] underline-offset-4 hover:text-[color:var(--hp-accent)] hover:underline"
    >
      {children}
    </Link>
  );
}

function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-start md:gap-x-8 md:gap-y-3">
      <div>
        <p className="text-xs font-medium text-[color:var(--hp-muted)]">
          記録する
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 border-l border-[color:var(--hp-border)] pl-3 md:mt-1.5 md:flex-row md:flex-wrap md:gap-x-3 md:gap-y-1 md:border-l-0 md:pl-0">
          {recordLinks.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} onNavigate={onNavigate}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-[color:var(--hp-muted)]">
          健康情報
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 border-l border-[color:var(--hp-border)] pl-3 md:mt-1.5 md:flex-row md:flex-wrap md:gap-x-3 md:gap-y-1 md:border-l-0 md:pl-0">
          {healthInfoLinks.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} onNavigate={onNavigate}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-[color:var(--hp-muted)]">
          設定
        </p>
        <div className="mt-2 md:mt-1.5">
          <NavLink href={appPath("/settings")} onNavigate={onNavigate}>
            設定
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const signedInWithEmail = Boolean(user && !user.isAnonymous);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();
  const inApp = pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`);
  const loginRedirect =
    inApp && pathname.length > 0 ? pathname : appPath("/dashboard");
  const loginHref = `${appPath("/login")}?redirect=${encodeURIComponent(loginRedirect)}`;
  const signupHref = `${appPath("/login")}?redirect=${encodeURIComponent(loginRedirect)}&mode=signup`;
  const brandHref = inApp ? appPath("/dashboard") : "/";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--hp-border)] bg-[color:var(--hp-surface)] shadow-sm">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link
            href={brandHref}
            className="flex min-w-0 flex-1 items-center font-semibold tracking-tight text-[color:var(--hp-foreground)]"
          >
            <span className="truncate">Health Park</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {signedInWithEmail ? (
              <span className="flex flex-wrap items-center justify-end gap-2 text-xs text-[color:var(--hp-muted)]">
                <span
                  className="max-w-[10rem] truncate sm:max-w-[14rem]"
                  title={user?.email ?? ""}
                >
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
              <>
                <Link
                  href={loginHref}
                  className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
                >
                  ログイン
                </Link>
                <Link
                  href={signupHref}
                  className="rounded-md bg-[color:var(--hp-signup)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-signup-fg)] transition-opacity hover:opacity-90"
                >
                  新規登録
                </Link>
              </>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:var(--hp-border)] text-[color:var(--hp-foreground)] md:hidden"
              aria-expanded={mobileOpen}
              aria-controls={panelId}
              aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="sr-only">メニュー</span>
              {mobileOpen ? (
                <span className="text-2xl leading-none" aria-hidden>
                  ×
                </span>
              ) : (
                <span className="flex flex-col gap-1.5" aria-hidden>
                  <span className="block h-0.5 w-5 rounded-sm bg-current" />
                  <span className="block h-0.5 w-5 rounded-sm bg-current" />
                  <span className="block h-0.5 w-5 rounded-sm bg-current" />
                </span>
              )}
            </button>
          </div>
        </div>

        {inApp ? (
          <nav
            className="hidden md:block"
            aria-label="主要ナビゲーション"
          >
            <NavSections />
          </nav>
        ) : (
          <nav
            className="hidden md:flex md:flex-wrap md:items-center md:gap-4"
            aria-label="案内"
          >
            <Link
              href={appPath("/dashboard")}
              className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
            >
              記録アプリへ
            </Link>
            <Link
              href="/portal"
              className="text-sm text-[color:var(--hp-muted)] underline-offset-4 hover:text-[color:var(--hp-accent)] hover:underline"
            >
              ご利用案内
            </Link>
          </nav>
        )}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="メニューを閉じる"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id={panelId}
            className="absolute inset-y-0 right-0 flex w-[min(100%,18rem)] flex-col border-l border-[color:var(--hp-border)] bg-[color:var(--hp-surface)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="サイトメニュー"
          >
            <div className="border-b border-[color:var(--hp-border)] px-4 py-3">
              <p className="text-sm font-medium text-[color:var(--hp-foreground)]">
                メニュー
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {inApp ? (
                <nav aria-label="主要ナビゲーション">
                  <NavSections onNavigate={() => setMobileOpen(false)} />
                </nav>
              ) : (
                <nav className="flex flex-col gap-3" aria-label="案内">
                  <Link
                    href={appPath("/dashboard")}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
                  >
                    記録アプリへ
                  </Link>
                  <Link
                    href="/portal"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-[color:var(--hp-muted)] underline-offset-4 hover:text-[color:var(--hp-accent)] hover:underline"
                  >
                    ご利用案内
                  </Link>
                </nav>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
