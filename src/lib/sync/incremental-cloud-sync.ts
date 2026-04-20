import {
  applyRemoteEntry,
  deleteBloodPressureEntry,
  deleteClinicEntry,
  deleteDailyReflectionEntry,
  deleteMealEntry,
  deletePrescriptionEntry,
  deleteStepsEntry,
  deleteWeightEntry,
  listBloodPressureEntries,
  listClinicEntries,
  listDailyReflectionEntries,
  listMealEntries,
  listPrescriptionEntries,
  listStepsEntries,
  listWeightEntries,
  putBloodPressureEntry,
  putClinicEntry,
  putDailyReflectionEntry,
  putMealEntry,
  putPrescriptionEntry,
  putStepsEntry,
  putWeightEntry,
  setSuppressCloudReplicate,
} from "@/lib/db";
import type {
  BloodPressureEntry,
  ClinicEntry,
  DailyReflectionEntry,
  MealEntry,
  PrescriptionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { serializePrescription } from "@/lib/db/backup";
import { ensureSignedInUser } from "@/lib/firebase/auth";
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

const COL_WEIGHT = "weight";
const COL_STEPS = "steps";
const COL_BP = "bloodPressure";
const COL_MEALS = "meals";
const COL_CLINICS = "clinics";
const COL_DAILY_REFLECTIONS = "dailyReflections";
const COL_RX = "prescriptions";

const STORE_WEIGHT = "weight";
const STORE_STEPS = "steps";
const STORE_BP = "bloodPressure";
const STORE_MEALS = "meals";
const STORE_CLINICS = "clinics";
const STORE_DAILY_REFLECTIONS = "dailyReflections";
const STORE_RX = "prescriptions";

function scrub<T extends object>(o: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(o)) as Record<string, unknown>;
}

function prescriptionImagePath(uid: string, id: string): string {
  return `users/${uid}/prescription_images/${id}`;
}

function versionOf(e: { updatedAt?: string; createdAt?: string }): string {
  return e.updatedAt ?? e.createdAt ?? "";
}

export async function replicateAfterPut(
  storeName: string,
  entry: object,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  let uid: string;
  try {
    uid = await ensureSignedInUser();
  } catch {
    return;
  }
  const db = getFirebaseDb();
  const id = (entry as { id: string }).id;
  if (!id) {
    return;
  }

  if (storeName === STORE_RX) {
    const p = entry as PrescriptionEntry;
    const storage = getFirebaseStorage();
    let imageStoragePath: string | null = null;
    const imageMime: string | null = p.imageMime ?? null;
    const backup = serializePrescription(p);
    if (backup.imageBase64 && backup.imageBase64.length > 0) {
      const path = prescriptionImagePath(uid, id);
      const binary = Uint8Array.from(atob(backup.imageBase64), (c) =>
        c.charCodeAt(0),
      );
      await uploadBytes(ref(storage, path), binary, {
        contentType: imageMime || "image/jpeg",
      });
      imageStoragePath = path;
    } else {
      try {
        await deleteObject(ref(storage, prescriptionImagePath(uid, id)));
      } catch {
        // none
      }
    }
    const { imageBase64: _x, ...rest } = backup;
    void _x;
    await setDoc(doc(db, "users", uid, COL_RX, id), scrub({
      ...rest,
      imageStoragePath,
      imageMime,
    }));
    return;
  }

  const col =
    storeName === STORE_WEIGHT
      ? COL_WEIGHT
      : storeName === STORE_STEPS
        ? COL_STEPS
        : storeName === STORE_BP
          ? COL_BP
          : storeName === STORE_MEALS
            ? COL_MEALS
            : storeName === STORE_CLINICS
              ? COL_CLINICS
              : storeName === STORE_DAILY_REFLECTIONS
                ? COL_DAILY_REFLECTIONS
                : null;
  if (!col) {
    return;
  }
  await setDoc(doc(db, "users", uid, col, id), scrub(entry));
}

export async function replicateAfterDelete(
  storeName: string,
  id: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  let uid: string;
  try {
    uid = await ensureSignedInUser();
  } catch {
    return;
  }
  const db = getFirebaseDb();
  const col =
    storeName === STORE_WEIGHT
      ? COL_WEIGHT
      : storeName === STORE_STEPS
        ? COL_STEPS
        : storeName === STORE_BP
          ? COL_BP
          : storeName === STORE_MEALS
            ? COL_MEALS
            : storeName === STORE_CLINICS
              ? COL_CLINICS
              : storeName === STORE_DAILY_REFLECTIONS
                ? COL_DAILY_REFLECTIONS
                : storeName === STORE_RX
                  ? COL_RX
                  : null;
  if (!col) {
    return;
  }
  await deleteDoc(doc(db, "users", uid, col, id));
  if (storeName === STORE_RX) {
    try {
      await deleteObject(
        ref(getFirebaseStorage(), prescriptionImagePath(uid, id)),
      );
    } catch {
      // none
    }
  }
}

/** ログイン直後: ローカルとクラウドを updatedAt でマージ */
export async function mergeCloudWithLocal(): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  const uid = await ensureSignedInUser();
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();

  setSuppressCloudReplicate(true);
  try {
    await mergeSimpleCollection(db, COL_WEIGHT, STORE_WEIGHT, listWeightEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_WEIGHT, c);
      } else {
        await putWeightEntry(l);
      }
    }, putWeightEntry);

    await mergeSimpleCollection(db, COL_STEPS, STORE_STEPS, listStepsEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_STEPS, c);
      } else {
        await putStepsEntry(l);
      }
    }, putStepsEntry);

    await mergeSimpleCollection(db, COL_BP, STORE_BP, listBloodPressureEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_BP, c);
      } else {
        await putBloodPressureEntry(l);
      }
    }, putBloodPressureEntry);

    await mergeSimpleCollection(db, COL_MEALS, STORE_MEALS, listMealEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_MEALS, c);
      } else {
        await putMealEntry(l);
      }
    }, putMealEntry);

    await mergeSimpleCollection(db, COL_CLINICS, STORE_CLINICS, listClinicEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_CLINICS, c);
      } else {
        await putClinicEntry(l);
      }
    }, putClinicEntry);

    await mergeSimpleCollection(
      db,
      COL_DAILY_REFLECTIONS,
      STORE_DAILY_REFLECTIONS,
      listDailyReflectionEntries,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_DAILY_REFLECTIONS, c);
        } else {
          await putDailyReflectionEntry(l);
        }
      },
      putDailyReflectionEntry,
    );

    const pSnap = await getDocs(collection(db, "users", uid, COL_RX));
    const localRx = await listPrescriptionEntries();
    const localRxById = new Map(localRx.map((x) => [x.id, x]));
    const rxCloudIds = new Set(pSnap.docs.map((d) => d.id));
    for (const d of pSnap.docs) {
      const data = d.data() as {
        createdAt: string;
        updatedAt: string;
        medicines: PrescriptionEntry["medicines"];
        memo?: string;
        imageStoragePath?: string | null;
        imageMime?: string | null;
      };
      const local = localRxById.get(d.id);
      const entry: PrescriptionEntry = {
        id: d.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        medicines: data.medicines ?? [],
        memo: data.memo,
      };
      if (data.imageStoragePath) {
        const r = ref(storage, data.imageStoragePath);
        entry.imageBlob = await getBytes(r);
        entry.imageMime = data.imageMime ?? "image/jpeg";
      }
      const vC = versionOf(entry);
      const vL = local ? versionOf(local) : "";
      if (!local || vC > vL) {
        await applyRemoteEntry(STORE_RX, entry);
      } else {
        await putPrescriptionEntry(local);
      }
    }
    for (const p of localRx) {
      if (!rxCloudIds.has(p.id)) {
        await putPrescriptionEntry(p);
      }
    }
  } finally {
    setSuppressCloudReplicate(false);
  }
}

async function mergeSimpleCollection<T extends { id: string; createdAt: string; updatedAt?: string }>(
  db: ReturnType<typeof getFirebaseDb>,
  col: string,
  _store: string,
  listLocal: () => Promise<T[]>,
  mergeOne: (cloudRow: T, localRow: T | undefined) => Promise<void>,
  pushOnlyLocal: (row: T) => Promise<void>,
): Promise<void> {
  const uid = (await ensureSignedInUser());
  const snap = await getDocs(collection(db, "users", uid, col));
  const localList = await listLocal();
  const localById = new Map(localList.map((x) => [x.id, x]));
  const cloudIds = new Set(snap.docs.map((d) => d.id));
  for (const d of snap.docs) {
    const c = { ...(d.data() as object), id: d.id } as T;
    const l = localById.get(d.id);
    await mergeOne(c, l);
  }
  for (const l of localList) {
    if (!cloudIds.has(l.id)) {
      await pushOnlyLocal(l);
    }
  }
}

/** 他端末の変更をリアルタイムで IndexedDB に反映 */
export function startRemoteSync(uid: string): () => void {
  if (!isFirebaseConfigured()) {
    return () => {};
  }
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  const unsubs: Array<() => void> = [];

  const sub = (
    col: string,
    store: string,
    onDoc: (id: string, data: Record<string, unknown>) => Promise<void>,
  ) => {
    const q = collection(db, "users", uid, col);
    const u = onSnapshot(q, (snap) => {
      void (async () => {
        setSuppressCloudReplicate(true);
        try {
          for (const change of snap.docChanges()) {
            if (change.type === "removed") {
              const id = change.doc.id;
              if (store === STORE_WEIGHT) {
                await deleteWeightEntry(id);
              } else if (store === STORE_STEPS) {
                await deleteStepsEntry(id);
              } else if (store === STORE_BP) {
                await deleteBloodPressureEntry(id);
              } else if (store === STORE_MEALS) {
                await deleteMealEntry(id);
              } else if (store === STORE_CLINICS) {
                await deleteClinicEntry(id);
              } else if (store === STORE_DAILY_REFLECTIONS) {
                await deleteDailyReflectionEntry(id);
              } else if (store === STORE_RX) {
                await deletePrescriptionEntry(id);
              }
              continue;
            }
            const id = change.doc.id;
            const data = change.doc.data() as Record<string, unknown>;
            await onDoc(id, data);
          }
        } catch (e) {
          console.error("[Health Park] リモート同期の適用に失敗", e);
        } finally {
          setSuppressCloudReplicate(false);
        }
      })();
    });
    unsubs.push(u);
  };

  sub(COL_WEIGHT, STORE_WEIGHT, async (id, data) => {
    await applyRemoteEntry(STORE_WEIGHT, { ...data, id } as WeightEntry);
  });
  sub(COL_STEPS, STORE_STEPS, async (id, data) => {
    await applyRemoteEntry(STORE_STEPS, { ...data, id } as StepsEntry);
  });
  sub(COL_BP, STORE_BP, async (id, data) => {
    await applyRemoteEntry(STORE_BP, { ...data, id } as BloodPressureEntry);
  });
  sub(COL_MEALS, STORE_MEALS, async (id, data) => {
    await applyRemoteEntry(STORE_MEALS, { ...data, id } as MealEntry);
  });
  sub(COL_CLINICS, STORE_CLINICS, async (id, data) => {
    await applyRemoteEntry(STORE_CLINICS, { ...data, id } as ClinicEntry);
  });
  sub(COL_DAILY_REFLECTIONS, STORE_DAILY_REFLECTIONS, async (id, data) => {
    await applyRemoteEntry(STORE_DAILY_REFLECTIONS, {
      ...data,
      id,
    } as DailyReflectionEntry);
  });
  sub(COL_RX, STORE_RX, async (id, data) => {
    const d = data as {
      createdAt: string;
      updatedAt: string;
      medicines: PrescriptionEntry["medicines"];
      memo?: string;
      imageStoragePath?: string | null;
      imageMime?: string | null;
    };
    const entry: PrescriptionEntry = {
      id,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      medicines: d.medicines ?? [],
      memo: d.memo,
    };
    if (d.imageStoragePath) {
      const r = ref(storage, d.imageStoragePath);
      entry.imageBlob = await getBytes(r);
      entry.imageMime = d.imageMime ?? "image/jpeg";
    }
    await applyRemoteEntry(STORE_RX, entry);
  });

  return () => {
    unsubs.forEach((fn) => fn());
  };
}
