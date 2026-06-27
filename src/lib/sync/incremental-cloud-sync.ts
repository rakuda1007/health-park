import { normalizeDailyReflectionEntry } from "@/lib/reflection-display";
import {
  applyRemoteEntry,
  deleteBloodPressureEntry,
  deleteClinicAppointmentEntry,
  deleteClinicEntry,
  deleteDailyReflectionEntry,
  deleteMealEntry,
  deleteMealItemMaster,
  deleteMealSetMaster,
  deletePastMedicalHistoryEntry,
  deletePrescriptionEntry,
  deleteStepsEntry,
  deleteWeightEntry,
  getEntryById,
  listBloodPressureEntries,
  listClinicAppointments,
  listClinicEntries,
  listDailyReflectionEntries,
  listMealEntries,
  listMealItemMasters,
  listMealSetMasters,
  listPastMedicalHistoryEntries,
  listPrescriptionEntries,
  listStepsEntries,
  listWeightEntries,
  setSuppressCloudReplicate,
} from "@/lib/db";
import type {
  BloodPressureEntry,
  ClinicAppointmentEntry,
  ClinicEntry,
  MealEntry,
  MealItemMaster,
  MealSetMaster,
  PastMedicalHistoryEntry,
  PrescriptionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { serializePrescription } from "@/lib/db/backup";
import { notifyHealthDataChanged } from "@/lib/data-changed";
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
const COL_MEAL_ITEM_MASTERS = "mealItemMasters";
const COL_MEAL_SET_MASTERS = "mealSetMasters";
const COL_CLINICS = "clinics";
const COL_CLINIC_APPOINTMENTS = "clinicAppointments";
const COL_DAILY_REFLECTIONS = "dailyReflections";
const COL_PAST_MEDICAL_HISTORY = "pastMedicalHistory";
const COL_RX = "prescriptions";

const STORE_WEIGHT = "weight";
const STORE_STEPS = "steps";
const STORE_BP = "bloodPressure";
const STORE_MEALS = "meals";
const STORE_MEAL_ITEM_MASTERS = "mealItemMasters";
const STORE_MEAL_SET_MASTERS = "mealSetMasters";
const STORE_CLINICS = "clinics";
const STORE_CLINIC_APPOINTMENTS = "clinicAppointments";
const STORE_DAILY_REFLECTIONS = "dailyReflections";
const STORE_PAST_MEDICAL_HISTORY = "pastMedicalHistory";
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

async function applyRemoteEntryIfNewer(
  storeName: string,
  entry: object,
): Promise<void> {
  const id = (entry as { id: string }).id;
  if (!id) {
    return;
  }
  const local = await getEntryById(storeName, id);
  if (local && typeof local === "object") {
    const vR = versionOf(entry as { updatedAt?: string; createdAt?: string });
    const vL = versionOf(local as { updatedAt?: string; createdAt?: string });
    if (vL >= vR) {
      return;
    }
  }
  await applyRemoteEntry(storeName, entry);
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
            : storeName === STORE_MEAL_ITEM_MASTERS
              ? COL_MEAL_ITEM_MASTERS
              : storeName === STORE_MEAL_SET_MASTERS
                ? COL_MEAL_SET_MASTERS
                : storeName === STORE_CLINICS
              ? COL_CLINICS
              : storeName === STORE_CLINIC_APPOINTMENTS
                ? COL_CLINIC_APPOINTMENTS
                : storeName === STORE_DAILY_REFLECTIONS
                  ? COL_DAILY_REFLECTIONS
                  : storeName === STORE_PAST_MEDICAL_HISTORY
                    ? COL_PAST_MEDICAL_HISTORY
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
            : storeName === STORE_MEAL_ITEM_MASTERS
              ? COL_MEAL_ITEM_MASTERS
              : storeName === STORE_MEAL_SET_MASTERS
                ? COL_MEAL_SET_MASTERS
                : storeName === STORE_CLINICS
              ? COL_CLINICS
              : storeName === STORE_CLINIC_APPOINTMENTS
                ? COL_CLINIC_APPOINTMENTS
                : storeName === STORE_DAILY_REFLECTIONS
                  ? COL_DAILY_REFLECTIONS
                  : storeName === STORE_PAST_MEDICAL_HISTORY
                    ? COL_PAST_MEDICAL_HISTORY
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
      } else if (versionOf(l) > versionOf(c)) {
        await replicateAfterPut(STORE_WEIGHT, l);
      }
    }, async (l) => {
      await replicateAfterPut(STORE_WEIGHT, l);
    });

    await mergeSimpleCollection(db, COL_STEPS, STORE_STEPS, listStepsEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_STEPS, c);
      } else if (versionOf(l) > versionOf(c)) {
        await replicateAfterPut(STORE_STEPS, l);
      }
    }, async (l) => {
      await replicateAfterPut(STORE_STEPS, l);
    });

    await mergeSimpleCollection(db, COL_BP, STORE_BP, listBloodPressureEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_BP, c);
      } else if (versionOf(l) > versionOf(c)) {
        await replicateAfterPut(STORE_BP, l);
      }
    }, async (l) => {
      await replicateAfterPut(STORE_BP, l);
    });

    await mergeSimpleCollection(db, COL_MEALS, STORE_MEALS, listMealEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_MEALS, c);
      } else if (versionOf(l) > versionOf(c)) {
        await replicateAfterPut(STORE_MEALS, l);
      }
    }, async (l) => {
      await replicateAfterPut(STORE_MEALS, l);
    });

    await mergeSimpleCollection(
      db,
      COL_MEAL_ITEM_MASTERS,
      STORE_MEAL_ITEM_MASTERS,
      listMealItemMasters,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_MEAL_ITEM_MASTERS, c);
        } else if (versionOf(l) > versionOf(c)) {
          await replicateAfterPut(STORE_MEAL_ITEM_MASTERS, l);
        }
      },
      async (l) => {
        await replicateAfterPut(STORE_MEAL_ITEM_MASTERS, l);
      },
    );

    await mergeSimpleCollection(
      db,
      COL_MEAL_SET_MASTERS,
      STORE_MEAL_SET_MASTERS,
      listMealSetMasters,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_MEAL_SET_MASTERS, c);
        } else if (versionOf(l) > versionOf(c)) {
          await replicateAfterPut(STORE_MEAL_SET_MASTERS, l);
        }
      },
      async (l) => {
        await replicateAfterPut(STORE_MEAL_SET_MASTERS, l);
      },
    );

    await mergeSimpleCollection(db, COL_CLINICS, STORE_CLINICS, listClinicEntries, async (c, l) => {
      if (!l || versionOf(c) > versionOf(l)) {
        await applyRemoteEntry(STORE_CLINICS, c);
      } else if (versionOf(l) > versionOf(c)) {
        await replicateAfterPut(STORE_CLINICS, l);
      }
    }, async (l) => {
      await replicateAfterPut(STORE_CLINICS, l);
    });

    await mergeSimpleCollection(
      db,
      COL_CLINIC_APPOINTMENTS,
      STORE_CLINIC_APPOINTMENTS,
      listClinicAppointments,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_CLINIC_APPOINTMENTS, c);
        } else if (versionOf(l) > versionOf(c)) {
          await replicateAfterPut(STORE_CLINIC_APPOINTMENTS, l);
        }
      },
      async (l) => {
        await replicateAfterPut(STORE_CLINIC_APPOINTMENTS, l);
      },
    );

    await mergeSimpleCollection(
      db,
      COL_DAILY_REFLECTIONS,
      STORE_DAILY_REFLECTIONS,
      listDailyReflectionEntries,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_DAILY_REFLECTIONS, c);
        } else if (versionOf(l) > versionOf(c)) {
          await replicateAfterPut(STORE_DAILY_REFLECTIONS, l);
        }
      },
      async (l) => {
        await replicateAfterPut(STORE_DAILY_REFLECTIONS, l);
      },
    );

    await mergeSimpleCollection(
      db,
      COL_PAST_MEDICAL_HISTORY,
      STORE_PAST_MEDICAL_HISTORY,
      listPastMedicalHistoryEntries,
      async (c, l) => {
        if (!l || versionOf(c) > versionOf(l)) {
          await applyRemoteEntry(STORE_PAST_MEDICAL_HISTORY, c);
        } else if (versionOf(l) > versionOf(c)) {
          await replicateAfterPut(STORE_PAST_MEDICAL_HISTORY, l);
        }
      },
      async (l) => {
        await replicateAfterPut(STORE_PAST_MEDICAL_HISTORY, l);
      },
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
      } else if (vL > vC) {
        await replicateAfterPut(STORE_RX, local);
      }
    }
    for (const p of localRx) {
      if (!rxCloudIds.has(p.id)) {
        await replicateAfterPut(STORE_RX, p);
      }
    }
  } finally {
    setSuppressCloudReplicate(false);
    notifyHealthDataChanged();
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
              } else if (store === STORE_MEAL_ITEM_MASTERS) {
                await deleteMealItemMaster(id);
              } else if (store === STORE_MEAL_SET_MASTERS) {
                await deleteMealSetMaster(id);
              } else if (store === STORE_CLINICS) {
                await deleteClinicEntry(id);
              } else if (store === STORE_CLINIC_APPOINTMENTS) {
                await deleteClinicAppointmentEntry(id);
              } else if (store === STORE_DAILY_REFLECTIONS) {
                await deleteDailyReflectionEntry(id);
              } else if (store === STORE_PAST_MEDICAL_HISTORY) {
                await deletePastMedicalHistoryEntry(id);
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
          notifyHealthDataChanged();
        }
      })();
    });
    unsubs.push(u);
  };

  sub(COL_WEIGHT, STORE_WEIGHT, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_WEIGHT, { ...data, id } as WeightEntry);
  });
  sub(COL_STEPS, STORE_STEPS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_STEPS, { ...data, id } as StepsEntry);
  });
  sub(COL_BP, STORE_BP, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_BP, { ...data, id } as BloodPressureEntry);
  });
  sub(COL_MEALS, STORE_MEALS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_MEALS, { ...data, id } as MealEntry);
  });
  sub(COL_MEAL_ITEM_MASTERS, STORE_MEAL_ITEM_MASTERS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_MEAL_ITEM_MASTERS, {
      ...data,
      id,
    } as MealItemMaster);
  });
  sub(COL_MEAL_SET_MASTERS, STORE_MEAL_SET_MASTERS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_MEAL_SET_MASTERS, {
      ...data,
      id,
    } as MealSetMaster);
  });
  sub(COL_CLINICS, STORE_CLINICS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_CLINICS, { ...data, id } as ClinicEntry);
  });
  sub(COL_CLINIC_APPOINTMENTS, STORE_CLINIC_APPOINTMENTS, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_CLINIC_APPOINTMENTS, {
      ...data,
      id,
    } as ClinicAppointmentEntry);
  });
  sub(COL_DAILY_REFLECTIONS, STORE_DAILY_REFLECTIONS, async (id, data) => {
    const normalized = normalizeDailyReflectionEntry({ ...data, id });
    if (!normalized) {
      return;
    }
    await applyRemoteEntryIfNewer(STORE_DAILY_REFLECTIONS, normalized);
  });
  sub(COL_PAST_MEDICAL_HISTORY, STORE_PAST_MEDICAL_HISTORY, async (id, data) => {
    await applyRemoteEntryIfNewer(STORE_PAST_MEDICAL_HISTORY, {
      ...data,
      id,
    } as PastMedicalHistoryEntry);
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
    await applyRemoteEntryIfNewer(STORE_RX, entry);
  });

  return () => {
    unsubs.forEach((fn) => fn());
  };
}
