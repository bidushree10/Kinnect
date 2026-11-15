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
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Appointment } from '../types';

export interface AddAppointmentInput {
  patientId: string;
  title: string;
  doctor: string;
  location: string;
  dateTime: string; // ISO 8601 string or YYYY-MM-DDTHH:MM
}

/**
 * Creates a new medical appointment.
 * Status defaults to "unconfirmed" (never auto-marked as missed).
 */
export async function addAppointment(input: AddAppointmentInput): Promise<Appointment> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const { patientId, title, doctor, location, dateTime } = input;

  if (!patientId.trim()) throw new Error('Patient ID is required.');
  if (!title.trim()) throw new Error('Appointment title is required.');
  if (!doctor.trim()) throw new Error('Doctor name is required.');
  if (!location.trim()) throw new Error('Location is required.');
  if (!dateTime.trim()) throw new Error('Date and time are required.');

  const aptRef = doc(collection(db, 'appointments'));
  const newAppointment: Appointment = {
    id: aptRef.id,
    patientId: patientId.trim(),
    title: title.trim(),
    doctor: doctor.trim(),
    location: location.trim(),
    dateTime: dateTime.trim(),
    status: 'unconfirmed',
    createdBy: currentUser.uid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(aptRef, {
    ...newAppointment,
    serverCreatedAt: serverTimestamp(),
  });

  return newAppointment;
}

/**
 * Retrieves all appointments for a patient.
 */
export async function getAppointments(patientId: string): Promise<Appointment[]> {
  const q = query(
    collection(db, 'appointments'),
    where('patientId', '==', patientId),
    orderBy('dateTime', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Appointment);
}

/**
 * Gets a single appointment by ID.
 */
export async function getAppointment(aptId: string): Promise<Appointment | null> {
  const snap = await getDoc(doc(db, 'appointments', aptId));
  if (!snap.exists()) return null;
  return snap.data() as Appointment;
}

/**
 * Updates appointment details (family member only).
 */
export async function updateAppointmentDetails(
  aptId: string,
  updates: Partial<Pick<Appointment, 'title' | 'doctor' | 'location' | 'dateTime'>>
): Promise<void> {
  const aptRef = doc(db, 'appointments', aptId);
  await updateDoc(aptRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes an appointment (family member only).
 */
export async function deleteAppointment(aptId: string): Promise<void> {
  const aptRef = doc(db, 'appointments', aptId);
  await deleteDoc(aptRef);
}

/**
 * Real-time listener for appointments of a patient.
 */
export function subscribeAppointments(
  patientId: string,
  onUpdate: (appointments: Appointment[]) => void
): () => void {
  const q = query(
    collection(db, 'appointments'),
    where('patientId', '==', patientId),
    orderBy('dateTime', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Appointment);
    onUpdate(list);
  });
}

