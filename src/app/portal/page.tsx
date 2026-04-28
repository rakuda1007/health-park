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
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <section className="rounded-2xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-6">
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
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
          Health Park ご利用案内
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--hp-muted)]">
          体重・歩数・血圧・食事・振り返りなどを、まずはこの端末だけで手軽に記録できるヘルス記録アプリです。登録なしで始められ、必要になったときだけログインしてクラウド同期を使えます。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={appPath("/dashboard")}
            className="inline-flex items-center justify-center rounded-lg bg-[color:var(--hp-accent)] px-5 py-2.5 text-sm font-medium text-[color:var(--hp-accent-fg)] transition-opacity hover:opacity-90"
          >
            記録アプリを開く
          </Link>
          <Link
            href={appPath("/login")}
            className="inline-flex items-center justify-center rounded-lg border border-[color:var(--hp-border)] px-5 py-2.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-input)]"
          >
            ログイン / 新規登録
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--hp-foreground)]">
          できること
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--hp-muted)]">
          <li>・日々の体重・歩数・血圧・食事・振り返りをまとめて記録</li>
          <li>・ダッシュボードで日次/週次/月次の推移を確認</li>
          <li>・通院予定、病院情報、処方箋、既往歴も一緒に管理</li>
          <li>・必要に応じて JSON バックアップやクラウド同期を利用</li>
        </ul>
      </section>

      <section className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--hp-foreground)]">
          はじめ方（3ステップ）
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-[color:var(--hp-muted)]">
          <li>1. 「記録アプリを開く」からホーム画面を表示</li>
          <li>2. 体重や歩数など、記録しやすい項目から入力開始</li>
          <li>3. 続けられそうなら、あとでログインして同期を有効化</li>
        </ol>
      </section>

      <section className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--hp-foreground)]">
          データ保存とプライバシー
        </h2>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--hp-muted)]">
          <p>
            標準では、記録データはこのブラウザ内（IndexedDB）に保存されます。URL は{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1 py-0.5 tabular-nums">
              {APP_BASE}
            </code>{" "}
            配下です。
          </p>
          <p>
            ログインすると Firebase へのバックアップ/同期が使えます。未ログインでもアプリ利用は可能です。
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--hp-foreground)]">
          よくある質問
        </h2>
        <div className="mt-3 space-y-3 text-sm text-[color:var(--hp-muted)]">
          <p>
            <span className="font-medium text-[color:var(--hp-foreground)]">
              Q. 登録しないと使えませんか？
            </span>
            <br />
            A. 使えます。まずはローカル保存だけで運用できます。
          </p>
          <p>
            <span className="font-medium text-[color:var(--hp-foreground)]">
              Q. 機種変更に備えたいです。
            </span>
            <br />
            A. ログインしてクラウド同期を使うか、バックアップ画面で JSON を保存してください。
          </p>
        </div>
      </section>
    </main>
  );
}
