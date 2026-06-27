import { computeUserStatsFromFirestore } from "@/lib/admin/compute-firestore-user-stats";
import {
  computeTelemetryStatsFromFirestore,
  telemetryDevicesQuery,
} from "@/lib/admin/compute-telemetry-stats";
import { isDeveloperAdminEmail } from "@/lib/admin/developer-allowlist";
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from "@/lib/firebase/admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Firestore の全件走査のため長めに（Vercel プランにより上限あり） */
export const maxDuration = 120;

const RECENT_WINDOW_DAYS = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  if (!token) {
    return NextResponse.json(
      { error: "Authorization: Bearer <ID トークン> が必要です。" },
      { status: 401 },
    );
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email;
    if (!isDeveloperAdminEmail(email)) {
      return NextResponse.json({ error: "開発者として許可されていません。" }, { status: 403 });
    }

    if (request.nextUrl.searchParams.get("probe") === "1") {
      return NextResponse.json({ developer: true });
    }

    const db = getFirebaseAdminFirestore();
    const nowMs = Date.now();
    const [firestoreStats, telemetryStats] = await Promise.all([
      computeUserStatsFromFirestore(
        (id) => db.collectionGroup(id),
        nowMs,
        RECENT_WINDOW_DAYS,
      ),
      computeTelemetryStatsFromFirestore(
        () => telemetryDevicesQuery(db).get(),
        nowMs,
        RECENT_WINDOW_DAYS,
      ),
    ]);
    return NextResponse.json({ ...firestoreStats, ...telemetryStats });
  } catch (e) {
    console.error("[api/admin/user-stats]", e);
    const msg = e instanceof Error ? e.message : "内部エラー";
    const isConfig =
      msg.includes("Firebase Admin") || msg.includes("認証情報");
    return NextResponse.json(
      { error: msg },
      { status: isConfig ? 503 : 500 },
    );
  }
}
