import type {
  BloodPressureEntry,
  ClinicEntry,
  MealEntry,
  MealSlot,
  PrescriptionEntry,
  StepsEntry,
  WeightEntry,
} from "./types";

const DB_NAME = "health-park";
const DB_VERSION = 1;

const STORE_WEIGHT = "weight";
const STORE_STEPS = "steps";
const STORE_BP = "bloodPressure";
const STORE_MEALS = "meals";
const STORE_CLINICS = "clinics";
const STORE_PRESCRIPTIONS = "prescriptions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
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
    dbPromise = openDb();
  }
  return dbPromise;
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

function putEntry(storeName: string, entry: object): Promise<void> {
  return getHealthDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("transaction error"));
        tx.objectStore(storeName).put(entry);
      }),
  );
}

function deleteEntry(storeName: string, id: string): Promise<void> {
  return getHealthDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("transaction error"));
        tx.objectStore(storeName).delete(id);
      }),
  );
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
