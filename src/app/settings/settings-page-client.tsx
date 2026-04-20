"use client";

import Link from "next/link";

export function SettingsPageClient() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        設定
      </h1>
      <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
        ここから各種設定を追加予定です。現時点ではデータのバックアップのみリンクしています。
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link
            href="/backup"
            className="text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            バックアップ（JSON の書き出し・読み込み）
          </Link>
        </li>
      </ul>
    </main>
  );
}
