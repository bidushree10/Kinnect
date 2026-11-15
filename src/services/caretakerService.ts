import {
  doc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { getSecondaryAuth } from '../lib/secondaryApp';
import { Caretaker, CaretakerPermissions, UserProfile } from '../types';

export interface CreateCaretakerInput {
  patientId: string;
  name: string;
  email: string;
  tempPassword: string;
  canEditSchedules?: boolean;
}

/**
 * Family creates a caretaker account using the secondary Firebase App instance.
 * Ensures the family member remains signed in.
 */
export async function createCaretaker(
  input: CreateCaretakerInput
): Promise<{ caretakerId: string; assignedPatientId: string; permissions: CaretakerPermissions }> {
  const currentFamilyUser = auth.currentUser;
  if (!currentFamilyUser) {
    throw new Error('Authentication required: only family members can assign caretakers.');
  }

  const { patientId, name, email, tempPassword, canEditSchedules = false } = input;
  const secondaryAuth = getSecondaryAuth();

  // Create Firebase Auth user on secondary app
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), tempPassword);
  const caretakerUid = cred.user.uid;

  // Sign out secondary auth to keep state isolated
  await signOut(secondaryAuth);

  const permissions: CaretakerPermissions = {
    canConfirm: true,
    canEditSchedules,
  };

  // 1. Write users/{caretakerUid}
  const userProfile: UserProfile = {
    uid: caretakerUid,
    role: 'caretaker',
    displayName: name.trim(),
    email: email.trim().toLowerCase(),
    patientId,
    familyId: currentFamilyUser.uid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', caretakerUid), {
    ...userProfile,
    serverCreatedAt: serverTimestamp(),
  });

  // 2. Write caretakers/{caretakerUid}
  const caretakerRecord: Caretaker = {
    uid: caretakerUid,
    patientId,
    familyId: currentFamilyUser.uid,
    permissions,
    active: true,
    createdAt: new Date().toISOString(),
    displayName: name.trim(),
    email: email.trim().toLowerCase(),
  };

  await setDoc(doc(db, 'caretakers', caretakerUid), {
    ...caretakerRecord,
    serverCreatedAt: serverTimestamp(),
  });

  // 3. Log activity in activity_logs
  await setDoc(doc(collection(db, 'activity_logs')), {
    patientId,
    itemType: 'caretaker',
    itemId: caretakerUid,
    action: 'CARETAKER_ASSIGNED',
    actorUid: currentFamilyUser.uid,
    actorRole: 'family',
    actorName: currentFamilyUser.displayName || 'Family Member',
    timestamp: serverTimestamp(),
  });

  // 4. Create notification for family record
  await setDoc(doc(collection(db, 'notifications')), {
    familyId: currentFamilyUser.uid,
    patientId,
    message: `Caretaker ${name.trim()} assigned to patient.`,
    read: false,
    createdAt: serverTimestamp(),
  });

  return {
    caretakerId: caretakerUid,
    assignedPatientId: patientId,
    permissions,
  };
}

/**
 * Updates caretaker's permissions (e.g. toggle canEditSchedules).
 * Family only.
 */
export async function updateCaretakerPermissions(input: {
  caretakerId: string;
  canEditSchedules: boolean;
  patientId: string;
}): Promise<void> {
  const currentFamilyUser = auth.currentUser;
  if (!currentFamilyUser) {
    throw new Error('Authentication required.');
  }

  const { caretakerId, canEditSchedules, patientId } = input;
  const caretakerRef = doc(db, 'caretakers', caretakerId);

  await updateDoc(caretakerRef, {
    'permissions.canEditSchedules': canEditSchedules,
    updatedAt: serverTimestamp(),
  });

  // Audit log
  await setDoc(doc(collection(db, 'activity_logs')), {
    patientId,
    itemType: 'caretaker',
    itemId: caretakerId,
    action: canEditSchedules ? 'SCHEDULE_EDIT_PERMISSION_GRANTED' : 'SCHEDULE_EDIT_PERMISSION_REVOKED',
    actorUid: currentFamilyUser.uid,
    actorRole: 'family',
    actorName: currentFamilyUser.displayName || 'Family Member',
    timestamp: serverTimestamp(),
  });
}

/**
 * Revokes or restores caretaker access.
 */
export async function toggleCaretakerActiveStatus(input: {
  caretakerId: string;
  active: boolean;
  patientId: string;
}): Promise<void> {
  const currentFamilyUser = auth.currentUser;
  if (!currentFamilyUser) {
    throw new Error('Authentication required.');
  }

  const { caretakerId, active, patientId } = input;
  const caretakerRef = doc(db, 'caretakers', caretakerId);

  await updateDoc(caretakerRef, {
    active,
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, 'activity_logs')), {
    patientId,
    itemType: 'caretaker',
    itemId: caretakerId,
    action: active ? 'CARETAKER_ACTIVATED' : 'CARETAKER_REVOKED',
    actorUid: currentFamilyUser.uid,
    actorRole: 'family',
    actorName: currentFamilyUser.displayName || 'Family Member',
    timestamp: serverTimestamp(),
  });
}

/**
 * Real-time listener for caretakers assigned to a patient.
 */
export function subscribeCaretakers(
  patientId: string,
  onUpdate: (caretakers: Caretaker[]) => void
): () => void {
  const q = query(collection(db, 'caretakers'), where('patientId', '==', patientId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Caretaker);
    onUpdate(list);
  });
}

/**
 * Fetches caretakers assigned to a patient.
 */
export async function getCaretakers(patientId: string): Promise<Caretaker[]> {
  const q = query(collection(db, 'caretakers'), where('patientId', '==', patientId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Caretaker);
}

