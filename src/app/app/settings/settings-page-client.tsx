"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  DEFAULT_BP_AXIS_MAX,
  DEFAULT_BP_AXIS_MIN,
  DEFAULT_PULSE_AXIS_MAX,
  DEFAULT_PULSE_AXIS_MIN,
  DASHBOARD_PREFS_CHANGED,
  readDashboardDisplayPreferences,
  resetDashboardChartAxisPreferences,
  validateAxisRange,
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
  const [axisError, setAxisError] = useState<string | null>(null);
  const [bpMinDraft, setBpMinDraft] = useState(() =>
    String(readDashboardDisplayPreferences().bpAxisMin),
  );
  const [bpMaxDraft, setBpMaxDraft] = useState(() =>
    String(readDashboardDisplayPreferences().bpAxisMax),
  );
  const [pulseMinDraft, setPulseMinDraft] = useState(() =>
    String(readDashboardDisplayPreferences().pulseAxisMin),
  );
  const [pulseMaxDraft, setPulseMaxDraft] = useState(() =>
    String(readDashboardDisplayPreferences().pulseAxisMax),
  );
  const [weightMinDraft, setWeightMinDraft] = useState(() => {
    const w = readDashboardDisplayPreferences().weightAxisMin;
    return w == null ? "" : String(w);
  });
  const [weightMaxDraft, setWeightMaxDraft] = useState(() => {
    const w = readDashboardDisplayPreferences().weightAxisMax;
    return w == null ? "" : String(w);
  });

  const sync = useCallback(() => {
    const next = readDashboardDisplayPreferences();
    setPrefs(next);
    setBpMinDraft(String(next.bpAxisMin));
    setBpMaxDraft(String(next.bpAxisMax));
    setPulseMinDraft(String(next.pulseAxisMin));
    setPulseMaxDraft(String(next.pulseAxisMax));
    setWeightMinDraft(next.weightAxisMin == null ? "" : String(next.weightAxisMin));
    setWeightMaxDraft(next.weightAxisMax == null ? "" : String(next.weightAxisMax));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(DASHBOARD_PREFS_CHANGED, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(DASHBOARD_PREFS_CHANGED, sync);
      window.removeEventListener("focus", sync);
    };
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

  function commitBpAxisFromDraft() {
    const min = Number.parseInt(bpMinDraft, 10);
    const max = Number.parseInt(bpMaxDraft, 10);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      setAxisError("血圧の軸には整数を入力してください。");
      sync();
      return;
    }
    if (!validateAxisRange(min, max, 0, 300)) {
      setAxisError(
        "血圧の軸は、最小 0・最大 300 mmHg の範囲で、最小値より最大値が 10 以上大きくなるように指定してください。",
      );
      sync();
      return;
    }
    setAxisError(null);
    writeDashboardDisplayPreferences({ bpAxisMin: min, bpAxisMax: max });
    sync();
  }

  function commitPulseAxisFromDraft() {
    const min = Number.parseInt(pulseMinDraft, 10);
    const max = Number.parseInt(pulseMaxDraft, 10);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      setAxisError("脈拍の軸には整数を入力してください。");
      sync();
      return;
    }
    if (!validateAxisRange(min, max, 20, 250)) {
      setAxisError(
        "脈拍の軸は、最小 20・最大 250 回/分 の範囲で、最小値より最大値が 10 以上大きくなるように指定してください。",
      );
      sync();
      return;
    }
    setAxisError(null);
    writeDashboardDisplayPreferences({ pulseAxisMin: min, pulseAxisMax: max });
    sync();
  }

  function commitWeightAxisFromDraft() {
    const minStr = weightMinDraft.trim();
    const maxStr = weightMaxDraft.trim();
    if (minStr === "" && maxStr === "") {
      setAxisError(null);
      writeDashboardDisplayPreferences({
        weightAxisMin: null,
        weightAxisMax: null,
      });
      sync();
      return;
    }
    if (minStr === "" || maxStr === "") {
      // もう一方の入力待ち — エラーにせず draft を維持する
      setAxisError(null);
      return;
    }
    const min = Number.parseFloat(minStr);
    const max = Number.parseFloat(maxStr);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      setAxisError("体重の軸には数値を入力してください。");
      sync();
      return;
    }
    if (!validateAxisRange(min, max, 0, 500, 1)) {
      setAxisError(
        "体重の軸は、0〜500 kg の範囲で、最小値より最大値が 1 kg 以上大きくなるように指定してください。",
      );
      sync();
      return;
    }
    setAxisError(null);
    writeDashboardDisplayPreferences({ weightAxisMin: min, weightAxisMax: max });
    sync();
  }

  function resetAxes() {
    setAxisError(null);
    resetDashboardChartAxisPreferences();
    sync();
  }

  const settingsNumberInputClass =
    "w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-base text-[color:var(--hp-foreground)] tabular-nums";

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
              体重と歩数のグラフ、および振り返りの一覧をまとめて表示します。個別のオン・オフはできません。
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

        <div className="border-t border-[color:var(--hp-border)] pt-6">
          <h3 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            体重グラフの縦軸（kg）
          </h3>
          <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
            ホームの体重・歩数グラフ左側の目盛り範囲です。未入力のときは表示中の記録（と体重画面の目標帯）に合わせて自動で決まります。最小・最大を両方入力し、どちらかの欄からフォーカスを外すと保存されます。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最小</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={499}
                step={0.1}
                placeholder="自動"
                value={weightMinDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setWeightMinDraft(e.target.value)}
                onBlur={commitWeightAxisFromDraft}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最大</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={500}
                step={0.1}
                placeholder="自動"
                value={weightMaxDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setWeightMaxDraft(e.target.value)}
                onBlur={commitWeightAxisFromDraft}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-[color:var(--hp-border)] pt-6">
          <h3 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            血圧グラフの縦軸（mmHg）
          </h3>
          <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
            ホームの血圧グラフの目盛り範囲です。デフォルトは {DEFAULT_BP_AXIS_MIN}〜
            {DEFAULT_BP_AXIS_MAX} です。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最小</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={290}
                step={1}
                value={bpMinDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setBpMinDraft(e.target.value)}
                onBlur={commitBpAxisFromDraft}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最大</span>
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={300}
                step={1}
                value={bpMaxDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setBpMaxDraft(e.target.value)}
                onBlur={commitBpAxisFromDraft}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-[color:var(--hp-border)] pt-6">
          <h3 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            脈拍グラフの縦軸（回/分）
          </h3>
          <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
            血圧グラフ右側の脈拍の目盛り範囲です。デフォルトは {DEFAULT_PULSE_AXIS_MIN}
            〜{DEFAULT_PULSE_AXIS_MAX} です。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最小</span>
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={240}
                step={1}
                value={pulseMinDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setPulseMinDraft(e.target.value)}
                onBlur={commitPulseAxisFromDraft}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[color:var(--hp-muted)]">最大</span>
              <input
                type="number"
                inputMode="numeric"
                min={30}
                max={250}
                step={1}
                value={pulseMaxDraft}
                className={settingsNumberInputClass}
                onChange={(e) => setPulseMaxDraft(e.target.value)}
                onBlur={commitPulseAxisFromDraft}
              />
            </label>
          </div>
        </div>

        {axisError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {axisError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={resetAxes}
          className="rounded-lg border border-[color:var(--hp-border)] px-3 py-2 text-sm text-[color:var(--hp-foreground)] hover:border-[color:var(--hp-accent)]"
        >
          グラフの縦軸をデフォルトに戻す（体重は自動、血圧・脈拍は初期値）
        </button>

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
