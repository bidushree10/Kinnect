import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Patient } from '../types';

export interface ConfirmDoseInput {
  patientId: string;
  medId: string;
  dateStr: string; // YYYY-MM-DD
  medName: string;
}

export interface ConfirmAppointmentInput {
  patientId: string;
  aptId: string;
  appointmentTitle: string;
}

export interface ConfirmationResult {
  logId: string;
  itemId: string;
  status: 'taken' | 'attended';
  confirmedByName: string;
  confirmedByRole: string;
  time: string;
  familyNotified: boolean;
}

/**
 * Validates date string in YYYY-MM-DD format.
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
}

/**
 * Atomically confirms a medication dose.
 * Creates doses/{medId}_{YYYY-MM-DD} with status "taken" and links an immutable
 * activity_logs record and a family notification in ONE atomic batch.
 *
 * The confirmer identity (UID, role, name) is strictly read from the authenticated
 * session and verified against the users collection — NEVER accepted from client request parameters.
 */
export async function confirmDose(input: ConfirmDoseInput): Promise<ConfirmationResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required: You must be logged in to confirm a medication dose.');
  }

  const { patientId, medId, dateStr, medName } = input;

  if (!patientId.trim()) throw new Error('Patient ID is required.');
  if (!medId.trim()) throw new Error('Medication ID is required.');
  if (!isValidDateFormat(dateStr)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  // 1. Retrieve session caller's verified profile
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) {
    throw new Error('Authenticated user profile could not be found.');
  }
  const userProfile = userSnap.data() as UserProfile;

  // 2. Fetch patient record to verify familyId recipient
  const patientSnap = await getDoc(doc(db, 'patients', patientId));
  if (!patientSnap.exists()) {
    throw new Error('Patient record not found.');
  }
  const patientData = patientSnap.data() as Patient;

  const doseId = `${medId}_${dateStr}`;
  const logId = `${doseId}_log`;
  const notId = `not_dose_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 3. Construct and commit the single atomic batch
  const batch = writeBatch(db);

  // A. Create Dose Document (create-only, status: taken)
  batch.set(doc(db, 'doses', doseId), {
    id: doseId,
    patientId,
    medId,
    date: dateStr,
    status: 'taken',
    confirmedByUid: currentUser.uid,
    confirmedByRole: userProfile.role,
    confirmedByName: userProfile.displayName || 'Kinnect User',
    confirmedAt: serverTimestamp(),
    logId,
  });

  // B. Create Immutable Activity Log
  batch.set(doc(db, 'activity_logs', logId), {
    id: logId,
    patientId,
    itemType: 'dose',
    itemId: doseId,
    action: 'DOSE_TAKEN',
    actorUid: currentUser.uid,
    actorRole: userProfile.role,
    actorName: userProfile.displayName || 'Kinnect User',
    timestamp: serverTimestamp(),
  });

  // C. Create Family Notification
  batch.set(doc(db, 'notifications', notId), {
    id: notId,
    familyId: patientData.familyId,
    patientId,
    message: `${medName}: Confirmed by ${userProfile.displayName || userProfile.role}`,
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    logId,
    itemId: doseId,
    status: 'taken',
    confirmedByName: userProfile.displayName || 'Kinnect User',
    confirmedByRole: userProfile.role,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    familyNotified: true,
  };
}

/**
 * Atomically confirms attendance for an appointment.
 * Updates appointment status to "attended" and logs the activity and notification
 * in ONE atomic batch.
 */
export async function confirmAppointmentAttendance(
  input: ConfirmAppointmentInput
): Promise<ConfirmationResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const { patientId, aptId, appointmentTitle } = input;

  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!userSnap.exists()) {
    throw new Error('User profile record not found.');
  }
  const userProfile = userSnap.data() as UserProfile;

  const patientSnap = await getDoc(doc(db, 'patients', patientId));
  if (!patientSnap.exists()) {
    throw new Error('Patient record not found.');
  }
  const patientData = patientSnap.data() as Patient;

  const logId = `${aptId}_log`;
  const notId = `not_apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const batch = writeBatch(db);

  // A. Update appointment status to "attended"
  batch.update(doc(db, 'appointments', aptId), {
    status: 'attended',
    confirmedByUid: currentUser.uid,
    confirmedByRole: userProfile.role,
    confirmedByName: userProfile.displayName || 'Kinnect User',
    confirmedAt: serverTimestamp(),
    logId,
  });

  // B. Create Immutable Activity Log
  batch.set(doc(db, 'activity_logs', logId), {
    id: logId,
    patientId,
    itemType: 'appointment',
    itemId: aptId,
    action: 'APPOINTMENT_ATTENDED',
    actorUid: currentUser.uid,
    actorRole: userProfile.role,
    actorName: userProfile.displayName || 'Kinnect User',
    timestamp: serverTimestamp(),
  });

  // C. Create Family Notification
  batch.set(doc(db, 'notifications', notId), {
    id: notId,
    familyId: patientData.familyId,
    patientId,
    message: `${appointmentTitle}: Attended, confirmed by ${userProfile.displayName || userProfile.role}`,
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    logId,
    itemId: aptId,
    status: 'attended',
    confirmedByName: userProfile.displayName || 'Kinnect User',
    confirmedByRole: userProfile.role,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    familyNotified: true,
  };
}

