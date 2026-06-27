import {
  isTelemetryRecordType,
  TELEMETRY_ANONYMOUS_ID_RE,
  TELEMETRY_DEVICES_COLLECTION,
} from "@/lib/telemetry/constants";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MIN_RECORDED_AT_MS = Date.parse("2024-01-01T00:00:00.000Z");

function parseRecordedAtMs(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return null;
  }
  const now = Date.now();
  if (ms < MIN_RECORDED_AT_MS || ms > now + MAX_FUTURE_SKEW_MS) {
    return null;
  }
  return ms;
}

type RecordBody = {
  anonymousId?: unknown;
  recordType?: unknown;
  recordedAt?: unknown;
};

/** POST: ローカル記録のメタデータ（匿名 ID・種別・時刻のみ） */
export async function POST(request: Request) {
  let body: RecordBody;
  try {
    body = (await request.json()) as RecordBody;
  } catch {
    return NextResponse.json({ error: "JSON が不正です。" }, { status: 400 });
  }

  const anonymousId =
    typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";
  if (!TELEMETRY_ANONYMOUS_ID_RE.test(anonymousId)) {
    return NextResponse.json(
      { error: "anonymousId が不正です。" },
      { status: 400 },
    );
  }

  if (!isTelemetryRecordType(body.recordType)) {
    return NextResponse.json(
      { error: "recordType が不正です。" },
      { status: 400 },
    );
  }

  const recordedAtMs = parseRecordedAtMs(body.recordedAt);
  if (recordedAtMs == null) {
    return NextResponse.json(
      { error: "recordedAt が不正です。" },
      { status: 400 },
    );
  }
  const recordedAt = new Date(recordedAtMs).toISOString();

  try {
    const db = getFirebaseAdminFirestore();
    const ref = db.collection(TELEMETRY_DEVICES_COLLECTION).doc(anonymousId);
    const snap = await ref.get();
    const payload: Record<string, string> = {
      lastActiveAt: recordedAt,
      lastStoreType: body.recordType,
    };
    if (!snap.exists) {
      payload.firstActiveAt = recordedAt;
    }
    await ref.set(payload, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/telemetry/record]", e);
    const msg = e instanceof Error ? e.message : "内部エラー";
    const isConfig =
      msg.includes("Firebase Admin") || msg.includes("認証情報");
    return NextResponse.json(
      { error: msg },
      { status: isConfig ? 503 : 500 },
    );
  }
}
