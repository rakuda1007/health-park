import { getOrCreateAnonymousTelemetryId } from "./anonymous-id";
import { storeNameToTelemetryType } from "./constants";

async function shouldSkipBecauseEmailSignedIn(): Promise<boolean> {
  try {
    const { getFirebaseAuth, isFirebaseConfigured } = await import(
      "@/lib/firebase/client"
    );
    if (!isFirebaseConfigured()) {
      return false;
    }
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    const u = auth.currentUser;
    return Boolean(u && !u.isAnonymous);
  } catch {
    return false;
  }
}

/**
 * ローカル記録のメタデータのみサーバーへ送る（未ログイン／匿名のみ）。
 * 失敗しても記録処理には影響しない。
 */
export async function reportRecordActivity(storeName: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const recordType = storeNameToTelemetryType(storeName);
  if (!recordType) {
    return;
  }
  if (await shouldSkipBecauseEmailSignedIn()) {
    return;
  }

  const anonymousId = getOrCreateAnonymousTelemetryId();
  const recordedAt = new Date().toISOString();

  try {
    await fetch("/api/telemetry/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousId, recordType, recordedAt }),
      keepalive: true,
    });
  } catch {
    // テレメトリ失敗は無視
  }
}
