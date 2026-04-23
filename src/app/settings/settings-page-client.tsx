"use client";

import {
  readDashboardDisplayPreferences,
  writeDashboardDisplayPreferences,
} from "@/lib/dashboard-preferences";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function SettingsPageClient() {
  const [prefs, setPrefs] = useState(() =>
    readDashboardDisplayPreferences(),
  );

  const sync = useCallback(() => {
    setPrefs(readDashboardDisplayPreferences());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [sync]);

  function toggleCore(checked: boolean) {
    writeDashboardDisplayPreferences({ showCoreBundle: checked });
    sync();
  }

  function toggleBp(checked: boolean) {
    writeDashboardDisplayPreferences({ showBloodPressure: checked });
    sync();
  }

  function toggleAppt(checked: boolean) {
    writeDashboardDisplayPreferences({ showAppointments: checked });
    sync();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        設定
      </h1>
      <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
        ホーム（ダッシュボード）に表示する項目を選べます。設定はこのブラウザにのみ保存されます。
      </p>

      <section
        className="mt-8 space-y-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4"
        aria-labelledby="dash-prefs-heading"
      >
        <h2
          id="dash-prefs-heading"
          className="text-sm font-medium text-[color:var(--hp-foreground)]"
        >
          ダッシュボードの表示
        </h2>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.showCoreBundle}
            onChange={(e) => toggleCore(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-[color:var(--hp-border)]"
          />
          <span>
            <span className="font-medium text-[color:var(--hp-foreground)]">
              体重・歩数・振り返り（セット）
            </span>
            <span className="mt-0.5 block text-sm text-[color:var(--hp-muted)]">
              体重と歩数のグラフ、および振り返りのヒートマップをまとめて表示します。個別のオン・オフはできません。
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.showBloodPressure}
            onChange={(e) => toggleBp(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-[color:var(--hp-border)]"
          />
          <span>
            <span className="font-medium text-[color:var(--hp-foreground)]">
              血圧
            </span>
            <span className="mt-0.5 block text-sm text-[color:var(--hp-muted)]">
              血圧のグラフと、週ごとのサマリーでの血圧コメントを表示します。
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.showAppointments}
            onChange={(e) => toggleAppt(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-[color:var(--hp-border)]"
          />
          <span>
            <span className="font-medium text-[color:var(--hp-foreground)]">
              通院予定（7日以内）
            </span>
            <span className="mt-0.5 block text-sm text-[color:var(--hp-muted)]">
              1週間以内の通院予定の一覧をダッシュボード上部に表示します。
            </span>
          </span>
        </label>

        <p className="text-sm">
          <Link
            href="/dashboard"
            className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
          >
            ホーム（ダッシュボード）へ
          </Link>
        </p>
      </section>

      <ul className="mt-8 space-y-2 text-sm">
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
