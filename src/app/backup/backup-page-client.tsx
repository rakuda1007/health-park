"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  exportHealthParkJsonPretty,
  replaceAllFromBackup,
} from "@/lib/db/backup";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { pullCloudToLocal, pushLocalToCloud } from "@/lib/sync/cloud-sync";
import Link from "next/link";
import { useCallback, useState } from "react";

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function backupFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `health-park-backup-${y}${m}${day}-${h}${min}.json`;
}

export function BackupPageClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firebaseReady = isFirebaseConfigured();
  const { ready: authReady, user } = useAuth();
  const cloudAllowed =
    firebaseReady && authReady && user && !user.isAnonymous;

  const clearFeedback = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  async function handleExport() {
    clearFeedback();
    setBusy(true);
    try {
      const json = await exportHealthParkJsonPretty();
      downloadJson(backupFilename(), json);
      setMessage("エクスポートしました。ファイルを安全な場所に保管してください。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    clearFeedback();
    if (
      !window.confirm(
        "インポートすると、現在このブラウザに保存されているデータはすべて削除され、ファイルの内容に置き換わります。続行しますか？",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      await replaceAllFromBackup(raw);
      setMessage(
        "インポートが完了しました。各画面で内容を確認してください。",
      );
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError("JSON の読み取りに失敗しました。ファイル形式を確認してください。");
      } else {
        setError(e instanceof Error ? e.message : "インポートに失敗しました");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCloudPush() {
    clearFeedback();
    setBusy(true);
    try {
      await pushLocalToCloud();
      setMessage(
        "Firebase へバックアップしました。このブラウザの記録がサーバー側に反映されています。",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "クラウドへのバックアップに失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCloudPull() {
    clearFeedback();
    if (
      !window.confirm(
        "クラウド上のデータで、このブラウザの記録をすべて置き換えます。続行しますか？",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await pullCloudToLocal();
      setMessage(
        "クラウドから復元しました。各画面で内容を確認してください。",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "クラウドからの復元に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        バックアップ
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--hp-muted)]">
        すべての記録を JSON ファイルとしてダウンロードできます。機種変更やブラウザのデータ消去の前に、定期的なエクスポートを推奨します。インポートは
        <strong className="font-medium text-[color:var(--hp-foreground)]">
          現在のデータをすべて上書き
        </strong>
        します。通常の利用ではデータは端末内（IndexedDB）のみに保存され、オフラインでも記録できます。
      </p>

      <div className="mt-8 space-y-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
        <section aria-labelledby="cloud-heading">
          <h2
            id="cloud-heading"
            className="text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            Firebase バックアップ（任意）
          </h2>
          {firebaseReady && !authReady ? (
            <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
              認証状態を確認しています…
            </p>
          ) : null}
          {firebaseReady && authReady && cloudAllowed ? (
            <>
              <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
                ログイン中は、保存・削除のたびに自動で Firebase に同期されます。下のボタンは全件の手動同期・復元用です。プルはこの端末をクラウドの内容で
                <strong className="font-medium text-[color:var(--hp-foreground)]">
                  すべて置き換え
                </strong>
                ます。
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCloudPush()}
                  className="rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
                >
                  {busy ? "処理中…" : "今すぐバックアップ（プッシュ）"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCloudPull()}
                  className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-surface)] px-4 py-2 text-sm font-medium text-[color:var(--hp-foreground)] disabled:opacity-60"
                >
                  {busy ? "処理中…" : "クラウドから復元（プル）"}
                </button>
              </div>
            </>
          ) : null}
          {firebaseReady && authReady && !cloudAllowed ? (
            <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
              クラウドのバックアップ・復元には、メールアドレスとパスワードでの
              <Link
                href="/login?redirect=/backup"
                className="font-medium text-[color:var(--hp-accent)] underline"
              >
                ログイン
              </Link>
              が必要です。Firebase コンソールで
              <strong className="font-medium text-[color:var(--hp-foreground)]">
                メール／パスワード
              </strong>
              認証を有効にしてください。
            </p>
          ) : null}
          {!firebaseReady ? (
            <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
              利用するにはプロジェクト直下に{" "}
              <code className="rounded bg-[color:var(--hp-surface)] px-1 py-0.5 text-xs">
                .env.local
              </code>{" "}
              を作成し、
              <code className="rounded bg-[color:var(--hp-surface)] px-1 py-0.5 text-xs">
                .env.local.example
              </code>{" "}
              を参考に{" "}
              <code className="rounded bg-[color:var(--hp-surface)] px-1 py-0.5 text-xs">
                NEXT_PUBLIC_FIREBASE_*
              </code>{" "}
              を設定してください。Firebase コンソールでメール／パスワード認証・Firestore・Storage を有効にし、ルールをデプロイしてください。
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-6 space-y-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          ファイルでのバックアップ
        </h2>
        <section aria-labelledby="export-heading">
          <h3
            id="export-heading"
            className="text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            JSON エクスポート
          </h3>
          <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
            体重・歩数・血圧・食事・通院先・処方箋を1つの JSON にまとめます。
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="mt-3 rounded-lg bg-[color:var(--hp-accent)] px-4 py-2 text-sm font-medium text-[color:var(--hp-accent-fg)] disabled:opacity-60"
          >
            {busy ? "処理中…" : "JSON をダウンロード"}
          </button>
        </section>

        <section
          className="border-t border-[color:var(--hp-border)] pt-6"
          aria-labelledby="import-heading"
        >
          <h3
            id="import-heading"
            className="text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            インポート
          </h3>
          <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
            以前にエクスポートした JSON を選ぶと、現在のデータと置き換えます。
          </p>
          <label className="mt-3 inline-block">
            <span className="sr-only">バックアップ JSON を選択</span>
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => void handleImportFile(e)}
              className="text-sm text-[color:var(--hp-foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--hp-accent)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[color:var(--hp-accent-fg)] disabled:opacity-60"
            />
          </label>
        </section>
      </div>

      {message ? (
        <p
          className="mt-4 text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
