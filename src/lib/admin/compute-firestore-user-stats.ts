import type {
  DocumentData,
  QuerySnapshot,
} from "firebase-admin/firestore";

/** `users/{uid}/…` 配下の同期コレクション（incremental-cloud-sync と一致） */
export const USER_DATA_SUBCOLLECTIONS = [
  "weight",
  "steps",
  "bloodPressure",
  "meals",
  "clinics",
  "clinicAppointments",
  "dailyReflections",
  "pastMedicalHistory",
  "prescriptions",
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 記録の「最終アクティビティ」相当の時刻（ミリ秒）。取れない場合は null。 */
export function activityTimestampMs(data: DocumentData): number | null {
  const updatedAt = data.updatedAt;
  if (typeof updatedAt === "string") {
    const t = Date.parse(updatedAt);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const createdAt = data.createdAt;
  if (typeof createdAt === "string") {
    const t = Date.parse(createdAt);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const date = data.date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Date.parse(`${date}T15:00:00.000Z`);
  }
  const startsAt = data.startsAt;
  if (typeof startsAt === "string") {
    const t = Date.parse(startsAt);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const diagnosedOn = data.diagnosedOn;
  if (
    typeof diagnosedOn === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(diagnosedOn)
  ) {
    return Date.parse(`${diagnosedOn}T15:00:00.000Z`);
  }
  return null;
}

export function uidFromUsersSubcollectionPath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 4 && parts[0] === "users") {
    return parts[1] ?? null;
  }
  return null;
}

export type UserStatsResult = {
  /** いずれかの記録サブコレクションに1件以上あるユーザー */
  everEnteredDataUserCount: number;
  /** 直近30日以内に上記いずれかでアクティビティのあったユーザー */
  activeLast30DaysUserCount: number;
  /** 走査したドキュメント件数（開発用の目安） */
  documentsScanned: number;
  /** 集計の基準時刻（ISO） */
  computedAt: string;
  /** 直近アクティブ判定の窓（日） */
  recentWindowDays: number;
};

export async function computeUserStatsFromFirestore(
  collectionGroup: (id: string) => { get(): Promise<QuerySnapshot> },
  nowMs: number,
  recentWindowDays: number,
): Promise<UserStatsResult> {
  const recentCutoff = nowMs - recentWindowDays * MS_PER_DAY;
  const everUids = new Set<string>();
  const recentUids = new Set<string>();
  let documentsScanned = 0;

  for (const col of USER_DATA_SUBCOLLECTIONS) {
    const snap = await collectionGroup(col).get();
    for (const doc of snap.docs) {
      documentsScanned += 1;
      const uid = uidFromUsersSubcollectionPath(doc.ref.path);
      if (!uid) {
        continue;
      }
      everUids.add(uid);
      const ts = activityTimestampMs(doc.data());
      if (ts != null && ts >= recentCutoff) {
        recentUids.add(uid);
      }
    }
  }

  return {
    everEnteredDataUserCount: everUids.size,
    activeLast30DaysUserCount: recentUids.size,
    documentsScanned,
    computedAt: new Date(nowMs).toISOString(),
    recentWindowDays,
  };
}
