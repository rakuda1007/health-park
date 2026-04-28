import type { Metadata } from "next";
import Link from "next/link";
import { APP_BASE, appPath } from "@/lib/app-paths";

export const metadata: Metadata = {
  title: "ご利用案内",
  description:
    "テニスパークコミュニティ向けのヘルス記録。登録なしでブラウザ内に記録でき、ログインでクラウド同期にも対応します。",
};

export default function PortalPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs text-[color:var(--hp-muted)]">
        初めての方・コミュニティからの案内用ページです。いつも記録される方はトップ（
        <Link
          href="/"
          className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
        >
          サイトの先頭
        </Link>
        ）からすぐ記録画面が開きます。
      </p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
        Health Park
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--hp-muted)]">
        体重・歩数・血圧・食事・振り返りなどを、まずはこの端末のブラウザ内（IndexedDB）だけで記録できます。
        メールでログインすると、Firebase へのバックアップ・他端末との同期が利用できます。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={appPath("/dashboard")}
          className="inline-flex items-center justify-center rounded-lg bg-[color:var(--hp-accent)] px-5 py-2.5 text-sm font-medium text-[color:var(--hp-accent-fg)] transition-opacity hover:opacity-90"
        >
          記録アプリを開く
        </Link>
        <Link
          href={appPath("/login")}
          className="inline-flex items-center justify-center rounded-lg border border-[color:var(--hp-border)] px-5 py-2.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-card)]"
        >
          ログイン / 新規登録
        </Link>
      </div>
      <p className="mt-6 text-xs text-[color:var(--hp-muted)]">
        記録アプリの URL は{" "}
        <code className="rounded bg-[color:var(--hp-input)] px-1 py-0.5 tabular-nums">
          {APP_BASE}
        </code>{" "}
        から始まります。アカウント登録なしでも利用できます。
      </p>
    </main>
  );
}
