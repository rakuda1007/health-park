import type {
  BloodPressureEntry,
  ClinicAppointmentEntry,
  ClinicEntry,
  DailyReflectionEntry,
  MealEntry,
  MealSlot,
  PastMedicalHistoryEntry,
  PrescriptionEntry,
  StepsEntry,
  WeightEntry,
} from "./types";

const DB_NAME = "health-park";
const DB_VERSION = 5;

const STORE_WEIGHT = "weight";
const STORE_STEPS = "steps";
const STORE_BP = "bloodPressure";
const STORE_MEALS = "meals";
const STORE_CLINICS = "clinics";
const STORE_CLINIC_APPOINTMENTS = "clinicAppointments";
const STORE_PRESCRIPTIONS = "prescriptions";
const STORE_DAILY_REFLECTIONS = "dailyReflections";
const STORE_PAST_MEDICAL_HISTORY = "pastMedicalHistory";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onblocked = () => {
      console.warn(
        "[Health Park] IndexedDB の更新が別タブでブロックされています。他のタブを閉じて再読み込みしてください。",
      );
    };
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_WEIGHT)) {
        const s = db.createObjectStore(STORE_WEIGHT, { keyPath: "id" });
        s.createIndex("by-date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_STEPS)) {
        const s = db.createObjectStore(STORE_STEPS, { keyPath: "id" });
        s.createIndex("by-date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BP)) {
        const s = db.createObjectStore(STORE_BP, { keyPath: "id" });
        s.createIndex("by-date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_MEALS)) {
        const s = db.createObjectStore(STORE_MEALS, { keyPath: "id" });
        s.createIndex("by-date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CLINICS)) {
        db.createObjectStore(STORE_CLINICS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PRESCRIPTIONS)) {
        db.createObjectStore(STORE_PRESCRIPTIONS, { keyPath: "id" });
      }
      if (event.oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_DAILY_REFLECTIONS)) {
          const s = db.createObjectStore(STORE_DAILY_REFLECTIONS, {
            keyPath: "id",
          });
          s.createIndex("by-date", "date", { unique: false });
        }
      }
      if (event.oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_PAST_MEDICAL_HISTORY)) {
          db.createObjectStore(STORE_PAST_MEDICAL_HISTORY, { keyPath: "id" });
        }
      }
      /** 通院予定（v4 で欠落していた環境向けに contains で冪等に作成） */
      if (!db.objectStoreNames.contains(STORE_CLINIC_APPOINTMENTS)) {
        const s = db.createObjectStore(STORE_CLINIC_APPOINTMENTS, {
          keyPath: "id",
        });
        s.createIndex("by-date", "startsAt", { unique: false });
      }
    };
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getHealthDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB はこの環境では利用できません。"),
    );
  }
  if (!dbPromise) {
    dbPromise = openDb().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/**
 * ダッシュボード初期表示用。複数ストアを 1 トランザクションで読み（モバイルでの同時トランザクション失敗を避ける）。
 */
export async function loadDashboardSnapshot(): Promise<{
  weight: WeightEntry[];
  steps: StepsEntry[];
  dailyReflections: DailyReflectionEntry[];
  clinicAppointments: ClinicAppointmentEntry[];
  clinics: ClinicEntry[];
}> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const weight: WeightEntry[] = [];
    const steps: StepsEntry[] = [];
    const reflections: DailyReflectionEntry[] = [];
    let appointments: ClinicAppointmentEntry[] = [];
    let clinics: ClinicEntry[] = [];

    const tx = db.transaction(
      [
        STORE_WEIGHT,
        STORE_STEPS,
        STORE_DAILY_REFLECTIONS,
        STORE_CLINIC_APPOINTMENTS,
        STORE_CLINICS,
      ],
      "readonly",
    );
    tx.onerror = () =>
      reject(
        tx.error ?? new Error("IndexedDB の読み取りトランザクションに失敗しました"),
      );
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB の読み取りが中断されました"));

    let remaining = 5;
    const tryFinish = () => {
      remaining -= 1;
      if (remaining === 0) {
        resolve({
          weight,
          steps,
          dailyReflections: reflections,
          clinicAppointments: [...appointments].sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt),
          ),
          clinics: [...clinics].sort((a, b) => a.name.localeCompare(b.name, "ja")),
        });
      }
    };

    const openDateDesc = <T,>(storeName: string, out: T[]) => {
      const idx = tx.objectStore(storeName).index("by-date");
      const req = idx.openCursor(null, "prev");
      req.onerror = () => reject(req.error ?? new Error("cursor error"));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          out.push(cursor.value as T);
          cursor.continue();
        } else {
          tryFinish();
        }
      };
    };

    openDateDesc(STORE_WEIGHT, weight);
    openDateDesc(STORE_STEPS, steps);
    openDateDesc(STORE_DAILY_REFLECTIONS, reflections);

    const apReq = tx.objectStore(STORE_CLINIC_APPOINTMENTS).getAll();
    apReq.onerror = () => reject(apReq.error ?? new Error("getAll error"));
    apReq.onsuccess = () => {
      appointments = apReq.result as ClinicAppointmentEntry[];
      tryFinish();
    };

    const clReq = tx.objectStore(STORE_CLINICS).getAll();
    clReq.onerror = () => reject(clReq.error ?? new Error("getAll error"));
    clReq.onsuccess = () => {
      clinics = clReq.result as ClinicEntry[];
      tryFinish();
    };
  });
}

function listByDateDesc<T>(storeName: string): Promise<T[]> {
  return getHealthDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const idx = store.index("by-date");
        const req = idx.openCursor(null, "prev");
        const rows: T[] = [];
        req.onerror = () => reject(req.error ?? new Error("cursor error"));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            rows.push(cursor.value as T);
            cursor.continue();
          } else {
            resolve(rows);
          }
        };
      }),
  );
}

/** リモート同期中は Firestore へ再送しない（ループ防止） */
let suppressCloudReplicate = false;

export function setSuppressCloudReplicate(v: boolean): void {
  suppressCloudReplicate = v;
}

function putEntryRaw(storeName: string, entry: object): Promise<void> {
  return getHealthDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error ?? new Error("transaction error"));
        tx.objectStore(storeName).put(entry);
      }),
  );
}

function scheduleReplicateAfterPut(storeName: string, entry: object): void {
  if (suppressCloudReplicate) {
    return;
  }
  void import("@/lib/sync/incremental-cloud-sync").then((m) =>
    m.replicateAfterPut(storeName, entry).catch((err: unknown) => {
      console.error("[Health Park] クラウドへ複製に失敗しました", err);
    }),
  );
}

function scheduleReplicateAfterDelete(storeName: string, id: string): void {
  if (suppressCloudReplicate) {
    return;
  }
  void import("@/lib/sync/incremental-cloud-sync").then((m) =>
    m.replicateAfterDelete(storeName, id).catch((err: unknown) => {
      console.error("[Health Park] クラウドから削除に失敗しました", err);
    }),
  );
}

function bumpUpdatedAt<T extends object>(entry: T): T & { updatedAt: string } {
  return { ...entry, updatedAt: new Date().toISOString() };
}

function putEntry(storeName: string, entry: object): Promise<void> {
  const e = bumpUpdatedAt(entry as object);
  return putEntryRaw(storeName, e).then(() => {
    scheduleReplicateAfterPut(storeName, e);
  });
}

function deleteEntry(storeName: string, id: string): Promise<void> {
  return getHealthDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error ?? new Error("transaction error"));
        tx.objectStore(storeName).delete(id);
      }),
  ).then(() => {
    scheduleReplicateAfterDelete(storeName, id);
  });
}

/** リモート（Firestore スナップショット等）からの反映用。updatedAt は上書きしない */
export function applyRemoteEntry(storeName: string, entry: object): Promise<void> {
  return putEntryRaw(storeName, entry);
}

export async function getEntryById(
  storeName: string,
  id: string,
): Promise<unknown | undefined> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(id);
    req.onerror = () => reject(req.error ?? new Error("get error"));
    req.onsuccess = () => resolve(req.result);
  });
}

const slotOrder: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
};

export async function listWeightEntries(): Promise<WeightEntry[]> {
  return listByDateDesc<WeightEntry>(STORE_WEIGHT);
}

export function putWeightEntry(entry: WeightEntry): Promise<void> {
  return putEntry(STORE_WEIGHT, entry);
}

export function deleteWeightEntry(id: string): Promise<void> {
  return deleteEntry(STORE_WEIGHT, id);
}

export async function listStepsEntries(): Promise<StepsEntry[]> {
  return listByDateDesc<StepsEntry>(STORE_STEPS);
}

export function putStepsEntry(entry: StepsEntry): Promise<void> {
  return putEntry(STORE_STEPS, entry);
}

export function deleteStepsEntry(id: string): Promise<void> {
  return deleteEntry(STORE_STEPS, id);
}

export async function listBloodPressureEntries(): Promise<BloodPressureEntry[]> {
  return listByDateDesc<BloodPressureEntry>(STORE_BP);
}

export function putBloodPressureEntry(
  entry: BloodPressureEntry,
): Promise<void> {
  return putEntry(STORE_BP, entry);
}

export function deleteBloodPressureEntry(id: string): Promise<void> {
  return deleteEntry(STORE_BP, id);
}

export async function listMealEntries(): Promise<MealEntry[]> {
  const rows = await listByDateDesc<MealEntry>(STORE_MEALS);
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return slotOrder[a.slot] - slotOrder[b.slot];
  });
}

export function putMealEntry(entry: MealEntry): Promise<void> {
  return putEntry(STORE_MEALS, entry);
}

export function deleteMealEntry(id: string): Promise<void> {
  return deleteEntry(STORE_MEALS, id);
}

export async function listClinicEntries(): Promise<ClinicEntry[]> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLINICS, "readonly");
    const req = tx.objectStore(STORE_CLINICS).getAll();
    req.onerror = () => reject(req.error ?? new Error("getAll error"));
    req.onsuccess = () => {
      const rows = req.result as ClinicEntry[];
      rows.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      resolve(rows);
    };
  });
}

export function putClinicEntry(entry: ClinicEntry): Promise<void> {
  return putEntry(STORE_CLINICS, entry);
}

export function deleteClinicEntry(id: string): Promise<void> {
  return deleteEntry(STORE_CLINICS, id);
}

export async function listClinicAppointments(): Promise<
  ClinicAppointmentEntry[]
> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLINIC_APPOINTMENTS, "readonly");
    const req = tx.objectStore(STORE_CLINIC_APPOINTMENTS).getAll();
    req.onerror = () => reject(req.error ?? new Error("getAll error"));
    req.onsuccess = () => {
      const rows = req.result as ClinicAppointmentEntry[];
      rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      resolve(rows);
    };
  });
}

export function putClinicAppointmentEntry(
  entry: ClinicAppointmentEntry,
): Promise<void> {
  return putEntry(STORE_CLINIC_APPOINTMENTS, entry);
}

export function deleteClinicAppointmentEntry(id: string): Promise<void> {
  return deleteEntry(STORE_CLINIC_APPOINTMENTS, id);
}

export async function listPastMedicalHistoryEntries(): Promise<
  PastMedicalHistoryEntry[]
> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAST_MEDICAL_HISTORY, "readonly");
    const req = tx.objectStore(STORE_PAST_MEDICAL_HISTORY).getAll();
    req.onerror = () => reject(req.error ?? new Error("getAll error"));
    req.onsuccess = () => {
      const rows = req.result as PastMedicalHistoryEntry[];
      rows.sort((a, b) => {
        const ta = a.title.localeCompare(b.title, "ja");
        if (ta !== 0) {
          return ta;
        }
        return a.id.localeCompare(b.id);
      });
      resolve(rows);
    };
  });
}

export function putPastMedicalHistoryEntry(
  entry: PastMedicalHistoryEntry,
): Promise<void> {
  return putEntry(STORE_PAST_MEDICAL_HISTORY, entry);
}

export function deletePastMedicalHistoryEntry(id: string): Promise<void> {
  return deleteEntry(STORE_PAST_MEDICAL_HISTORY, id);
}

export async function listPrescriptionEntries(): Promise<PrescriptionEntry[]> {
  const db = await getHealthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRESCRIPTIONS, "readonly");
    const req = tx.objectStore(STORE_PRESCRIPTIONS).getAll();
    req.onerror = () => reject(req.error ?? new Error("getAll error"));
    req.onsuccess = () => {
      const rows = req.result as PrescriptionEntry[];
      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(rows);
    };
  });
}

export function putPrescriptionEntry(entry: PrescriptionEntry): Promise<void> {
  return putEntry(STORE_PRESCRIPTIONS, entry);
}

export function deletePrescriptionEntry(id: string): Promise<void> {
  return deleteEntry(STORE_PRESCRIPTIONS, id);
}

export async function listDailyReflectionEntries(): Promise<
  DailyReflectionEntry[]
> {
  return listByDateDesc<DailyReflectionEntry>(STORE_DAILY_REFLECTIONS);
}

export async function getDailyReflectionByDate(
  date: string,
): Promise<DailyReflectionEntry | undefined> {
  const list = await listDailyReflectionEntries();
  return list.find((r) => r.date === date);
}

export function putDailyReflectionEntry(
  entry: DailyReflectionEntry,
): Promise<void> {
  return putEntry(STORE_DAILY_REFLECTIONS, entry);
}

export function deleteDailyReflectionEntry(id: string): Promise<void> {
  return deleteEntry(STORE_DAILY_REFLECTIONS, id);
}
