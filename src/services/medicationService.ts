import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Medication, ComputedDoseItem, DoseRecord } from '../types';

export interface AddMedicationInput {
  patientId: string;
  name: string;
  strength: string;
  dosage: string;
  frequency: string; // Fixed to once-daily (e.g., 'Daily' or 'Once daily')
  scheduledTime: string; // HH:MM (24-hour format)
}

/**
 * Validates scheduled time in 24-hour format (HH:MM).
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim());
}

/**
 * Adds a new medication prescription.
 * Clinical fields (name, strength, dosage, frequency) are locked after creation.
 * Frequency is strictly once-daily for MVP.
 */
export async function addMedication(input: AddMedicationInput): Promise<Medication> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const { patientId, name, strength, dosage, frequency, scheduledTime } = input;

  if (!patientId.trim()) throw new Error('Patient ID is required.');
  if (!name.trim()) throw new Error('Medicine name is required.');
  if (!strength.trim()) throw new Error('Strength is required (e.g. 500mg).');
  if (!dosage.trim()) throw new Error('Dosage is required (e.g. 1 tablet).');
  if (!frequency.trim()) throw new Error('Frequency is required.');
  if (!isValidTimeFormat(scheduledTime)) {
    throw new Error('Invalid scheduled time. Must be in 24-hour format HH:MM (e.g. 08:00).');
  }

  const medRef = doc(collection(db, 'medications'));
  const newMedication: Medication = {
    id: medRef.id,
    patientId: patientId.trim(),
    name: name.trim(),
    strength: strength.trim(),
    dosage: dosage.trim(),
    frequency: 'Daily', // Enforce once-daily for MVP
    scheduledTime: scheduledTime.trim(),
    active: true,
    createdBy: currentUser.uid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(medRef, {
    ...newMedication,
    serverCreatedAt: serverTimestamp(),
  });

  return newMedication;
}

/**
 * Lists active medications for a given patient.
 */
export async function getMedications(patientId: string): Promise<Medication[]> {
  const q = query(
    collection(db, 'medications'),
    where('patientId', '==', patientId),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Medication);
}

/**
 * Updates the scheduled dose time of a medication.
 * Locked clinical fields (name, strength, dosage, frequency) cannot be modified.
 */
export async function updateMedicationTime(input: {
  medId: string;
  scheduledTime: string;
}): Promise<void> {
  const { medId, scheduledTime } = input;

  if (!isValidTimeFormat(scheduledTime)) {
    throw new Error('Invalid scheduled time format. Must be HH:MM.');
  }

  const medRef = doc(db, 'medications', medId);
  await updateDoc(medRef, {
    scheduledTime: scheduledTime.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a medication (family member only).
 */
export async function deleteMedication(medId: string): Promise<void> {
  const medRef = doc(db, 'medications', medId);
  await deleteDoc(medRef);
}

/**
 * Gets a medication by ID.
 */
export async function getMedication(medId: string): Promise<Medication | null> {
  const medRef = doc(db, 'medications', medId);
  const snap = await getDoc(medRef);
  if (!snap.exists()) return null;
  return snap.data() as Medication;
}

/**
 * Computes today's dose schedule for a patient on the given date (YYYY-MM-DD).
 * Doses are never pre-created; doses/{medId}_{date} documents exist ONLY if confirmed.
 * Unconfirmed items remain neutrally pending (never marked as missed).
 */
export async function getComputedDosesForDate(
  patientId: string,
  dateStr: string
): Promise<ComputedDoseItem[]> {
  const medications = await getMedications(patientId);

  // Query confirmed doses for this date
  const dosesQuery = query(
    collection(db, 'doses'),
    where('patientId', '==', patientId),
    where('date', '==', dateStr)
  );
  const dosesSnap = await getDocs(dosesQuery);
  const confirmedDosesMap = new Map<string, DoseRecord>();

  dosesSnap.docs.forEach((d) => {
    const data = d.data() as DoseRecord;
    confirmedDosesMap.set(data.medId, data);
  });

  return medications.map((med) => {
    const doseId = `${med.id}_${dateStr}`;
    const confirmedRecord = confirmedDosesMap.get(med.id);

    if (confirmedRecord) {
      return {
        doseId,
        medication: med,
        date: dateStr,
        status: 'taken',
        confirmedByUid: confirmedRecord.confirmedByUid,
        confirmedByRole: confirmedRecord.confirmedByRole,
        confirmedByName: confirmedRecord.confirmedByName,
        confirmedAt: confirmedRecord.confirmedAt,
      };
    }

    return {
      doseId,
      medication: med,
      date: dateStr,
      status: 'unconfirmed',
    };
  });
}

/**
 * Real-time listener for computed doses on a selected date.
 */
export function subscribeComputedDoses(
  patientId: string,
  dateStr: string,
  onUpdate: (doses: ComputedDoseItem[]) => void
): () => void {
  const medsQuery = query(
    collection(db, 'medications'),
    where('patientId', '==', patientId),
    where('active', '==', true)
  );

  const dosesQuery = query(
    collection(db, 'doses'),
    where('patientId', '==', patientId),
    where('date', '==', dateStr)
  );

  let currentMeds: Medication[] = [];
  let confirmedMap = new Map<string, DoseRecord>();

  const computeAndNotify = () => {
    const result: ComputedDoseItem[] = currentMeds.map((med) => {
      const doseId = `${med.id}_${dateStr}`;
      const conf = confirmedMap.get(med.id);
      if (conf) {
        return {
          doseId,
          medication: med,
          date: dateStr,
          status: 'taken',
          confirmedByUid: conf.confirmedByUid,
          confirmedByRole: conf.confirmedByRole,
          confirmedByName: conf.confirmedByName,
          confirmedAt: conf.confirmedAt,
        };
      }
      return {
        doseId,
        medication: med,
        date: dateStr,
        status: 'unconfirmed',
      };
    });
    onUpdate(result);
  };

  const unsubMeds = onSnapshot(medsQuery, (medsSnap) => {
    currentMeds = medsSnap.docs.map((d) => d.data() as Medication);
    computeAndNotify();
  });

  const unsubDoses = onSnapshot(dosesQuery, (dosesSnap) => {
    confirmedMap = new Map();
    dosesSnap.docs.forEach((d) => {
      const data = d.data() as DoseRecord;
      confirmedMap.set(data.medId, data);
    });
    computeAndNotify();
  });

  return () => {
    unsubMeds();
    unsubDoses();
  };
}

