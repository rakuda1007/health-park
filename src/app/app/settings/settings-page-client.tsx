"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  readDashboardDisplayPreferences,
  writeDashboardDisplayPreferences,
} from "@/lib/dashboard-preferences";
import { appPath } from "@/lib/app-paths";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function SettingsPageClient() {
  const { user, ready } = useAuth();
  const [showDevStatsLink, setShowDevStatsLink] = useState(false);
  /** probe 完了後、リンク非表示のときだけヒント用 */
  const [devStatsProbeDone, setDevStatsProbeDone] = useState(false);
  /** 直近の probe の HTTP ステータス（画面表示用） */
  const [devStatsProbeHttpStatus, setDevStatsProbeHttpStatus] = useState<
    number | "network_error" | null
  >(null);
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

  useEffect(() => {
    if (!isFirebaseConfigured() || !ready || !user) {
      setShowDevStatsLink(false);
      setDevStatsProbeDone(false);
      setDevStatsProbeHttpStatus(null);
      return;
    }
    let cancelled = false;
    setDevStatsProbeDone(false);
    setDevStatsProbeHttpStatus(null);
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/user-stats?probe=1", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!cancelled) {
          setDevStatsProbeHttpStatus(res.status);
          setShowDevStatsLink(res.ok);
          setDevStatsProbeDone(true);
        }
      } catch {
        if (!cancelled) {
          setDevStatsProbeHttpStatus("network_error");
          setShowDevStatsLink(false);
          setDevStatsProbeDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

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
            href={appPath("/dashboard")}
            className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
          >
            ホーム（ダッシュボード）へ
          </Link>
        </p>
      </section>

      <ul className="mt-8 space-y-2 text-sm">
        <li>
          <Link
            href={appPath("/settings/profile")}
            className="text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            プロフィール（ログイン中アカウントの確認）
          </Link>
        </li>
        <li>
          <Link
            href={appPath("/backup")}
            className="text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            バックアップ（JSON の書き出し・読み込み）
          </Link>
        </li>
        {showDevStatsLink ? (
          <li>
            <Link
              href={appPath("/dev/user-stats")}
              className="text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
            >
              利用統計（開発者向け）
            </Link>
          </li>
        ) : null}
      </ul>
      {isFirebaseConfigured() &&
      user &&
      devStatsProbeDone &&
      !showDevStatsLink ? (
        <div className="mt-4 max-w-xl space-y-2 text-xs leading-relaxed text-[color:var(--hp-muted)]">
          {devStatsProbeHttpStatus != null ? (
            <p className="text-[color:var(--hp-foreground)]">
              利用統計の確認リクエストの結果:{" "}
              <span className="font-mono tabular-nums">
                {devStatsProbeHttpStatus === "network_error"
                  ? "（ネットワークエラー・CORS 等で応答なし）"
                  : `HTTP ${devStatsProbeHttpStatus}`}
              </span>
            </p>
          ) : null}
          <p>
            「利用統計」はサーバーで開発者と判定された場合のみ表示されます。出ないときは
            <strong className="font-medium text-[color:var(--hp-foreground)]">
              両方
            </strong>
            必要です: ① Vercel 等の{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">
              DEVELOPER_ADMIN_EMAILS
            </code>{" "}
            に<strong>今ログインしているメール</strong>（プロフィールで確認）が含まれること
            ②{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">
              FIREBASE_SERVICE_ACCOUNT_JSON
            </code>{" "}
            または{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">
              FIREBASE_SERVICE_ACCOUNT_BASE64
            </code>{" "}
            がサーバーに設定され、JSON（特に{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">
              private_key
            </code>
            の改行が{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">\n</code>{" "}
            エスケープ）が正しいこと。
          </p>
          <p>
            上のステータスが <strong>403</strong> なら①、<strong>503 / 500</strong>{" "}
            なら②を疑ってください。Network に{" "}
            <code className="rounded bg-[color:var(--hp-input)] px-1">
              user-stats
            </code>{" "}
            が出ない場合は、<strong>ログインしたまま</strong>設定ページを表示したうえで、Network の左上が<strong>記録中</strong>（丸が赤）であることを確認し、フィルタを「Fetch/XHR」にするか、ページを再読み込み（F5）してから一覧を見直してください。検索パネル（Sources 横の検索）に出る文字列は、ネットワーク一覧とは別です。
          </p>
        </div>
      ) : null}
    </main>
  );
}
