"use client";

import { useAuth } from "@/contexts/auth-context";
import { appPath } from "@/lib/app-paths";
import Link from "next/link";
import { useCallback, useState } from "react";

type StatsPayload = {
  everEnteredDataUserCount: number;
  activeLast30DaysUserCount: number;
  documentsScanned: number;
  computedAt: string;
  recentWindowDays: number;
};

export function UserStatsPageClient() {
  const { user, ready, firebaseConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) {
      setError("ログインが必要です。");
      return;
    }
    setLoading(true);
    setError(null);
    setStats(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/user-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<StatsPayload>;
      if (!res.ok) {
        setError(body.error ?? `取得に失敗しました（${res.status}）`);
        return;
      }
      setStats({
        everEnteredDataUserCount: body.everEnteredDataUserCount ?? 0,
        activeLast30DaysUserCount: body.activeLast30DaysUserCount ?? 0,
        documentsScanned: body.documentsScanned ?? 0,
        computedAt: body.computedAt ?? "",
        recentWindowDays: body.recentWindowDays ?? 30,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (!firebaseConfigured) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-[color:var(--hp-muted)]">
          Firebase が未設定のため利用統計は利用できません。
        </p>
        <p className="mt-4 text-sm">
          <Link href={appPath("/settings")} className="text-[color:var(--hp-accent)] underline">
            設定へ
          </Link>
        </p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-[color:var(--hp-muted)]">読み込み中…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-[color:var(--hp-muted)]">
          このページを表示するにはログインしてください。
        </p>
        <p className="mt-4 text-sm">
          <Link href={appPath("/login")} className="text-[color:var(--hp-accent)] underline">
            ログイン
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        利用統計（開発者）
      </h1>
      <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
        Firestore のユーザー別サブコレクション（体重・歩数など）のみを集計します。サーバーで開発者メールに一致する場合のみ実行されます。
      </p>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={loading}
          className="rounded-md border border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-50"
        >
          {loading ? "集計中…" : "人数を再取得"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {stats ? (
        <dl className="mt-6 space-y-4 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4 text-sm">
          <div>
            <dt className="text-xs text-[color:var(--hp-muted)]">
              一度でもデータを入れたユーザー数
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--hp-foreground)]">
              {stats.everEnteredDataUserCount}
            </dd>
            <dd className="mt-1 text-xs text-[color:var(--hp-muted)]">
              いずれかの記録コレクションに1件以上ある UID のユニーク数
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[color:var(--hp-muted)]">
              直近 {stats.recentWindowDays} 日にデータ入力のあったユーザー数
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--hp-foreground)]">
              {stats.activeLast30DaysUserCount}
            </dd>
            <dd className="mt-1 text-xs text-[color:var(--hp-muted)]">
              各ドキュメントの日付・作成・更新のいずれかが窓内のユーザーを1人以上と数えます。
            </dd>
          </div>
          <div className="border-t border-[color:var(--hp-border)] pt-3 text-xs text-[color:var(--hp-muted)]">
            <p>走査ドキュメント数: {stats.documentsScanned.toLocaleString("ja-JP")}</p>
            <p className="mt-1">
              集計時刻:{" "}
              {stats.computedAt
                ? new Date(stats.computedAt).toLocaleString("ja-JP")
                : "—"}
            </p>
          </div>
        </dl>
      ) : null}

      <p className="mt-8 text-sm">
        <Link href={appPath("/settings")} className="text-[color:var(--hp-accent)] underline">
          設定へ戻る
        </Link>
      </p>
    </main>
  );
}
