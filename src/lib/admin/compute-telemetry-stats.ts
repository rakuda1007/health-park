import { TELEMETRY_DEVICES_COLLECTION } from "@/lib/telemetry/constants";
import type {
  DocumentData,
  Firestore,
  QuerySnapshot,
} from "firebase-admin/firestore";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function activityMs(data: DocumentData): number | null {
  const lastActiveAt = data.lastActiveAt;
  if (typeof lastActiveAt === "string") {
    const t = Date.parse(lastActiveAt);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const firstActiveAt = data.firstActiveAt;
  if (typeof firstActiveAt === "string") {
    const t = Date.parse(firstActiveAt);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return null;
}

export type TelemetryStatsResult = {
  /** テレメトリ送信端末（未ログイン記録）のユニーク数 */
  localOnlyEverRecordedDeviceCount: number;
  /** 直近窓内にテレメトリがあった端末数 */
  localOnlyActiveLast30DaysDeviceCount: number;
  /** 走査した telemetryDevices ドキュメント数 */
  telemetryDocumentsScanned: number;
};

export async function computeTelemetryStatsFromFirestore(
  listTelemetryDevices: () => Promise<QuerySnapshot>,
  nowMs: number,
  recentWindowDays: number,
): Promise<TelemetryStatsResult> {
  const recentCutoff = nowMs - recentWindowDays * MS_PER_DAY;
  let everCount = 0;
  let recentCount = 0;
  let documentsScanned = 0;

  const snap = await listTelemetryDevices();
  for (const doc of snap.docs) {
    documentsScanned += 1;
    everCount += 1;
    const ts = activityMs(doc.data());
    if (ts != null && ts >= recentCutoff) {
      recentCount += 1;
    }
  }

  return {
    localOnlyEverRecordedDeviceCount: everCount,
    localOnlyActiveLast30DaysDeviceCount: recentCount,
    telemetryDocumentsScanned: documentsScanned,
  };
}

export function telemetryDevicesQuery(db: Firestore) {
  return db.collection(TELEMETRY_DEVICES_COLLECTION);
}
