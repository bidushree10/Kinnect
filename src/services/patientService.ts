import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { getSecondaryAuth } from '../lib/secondaryApp';
import { generatePatientId } from '../lib/idGenerator';
import { Patient, UserProfile } from '../types';

export interface CreatePatientProfileInput {
  name: string;
  canUseSmartphone?: boolean;
}

export interface CreatePatientLoginInput {
  patientId: string;
  name: string;
  email: string;
  tempPassword: string;
}

/**
 * Creates a new patient profile with collision-retry logic.
 * Generates KIN-XXXX-XXXX, verifies uniqueness in Firestore, and retries if collision occurs.
 */
export async function createPatientProfile(
  input: CreatePatientProfileInput,
  maxRetries = 5
): Promise<Patient> {
  const currentFamilyUser = auth.currentUser;
  if (!currentFamilyUser) {
    throw new Error('Authentication required: only logged-in family members can create a patient profile.');
  }

  const { name, canUseSmartphone = false } = input;
  if (!name.trim()) {
    throw new Error('Patient name is required.');
  }

  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    const candidateId = generatePatientId();
    const patientDocRef = doc(db, 'patients', candidateId);
    let candidateExists = false;
    try {
      const existingSnap = await getDoc(patientDocRef);
      candidateExists = existingSnap.exists();
    } catch {
      // If getDoc throws permission error on non-existing document, candidate is unused
      candidateExists = false;
    }

    if (!candidateExists) {
      const newPatient: Patient = {
        id: candidateId,
        familyId: currentFamilyUser.uid,
        name: name.trim(),
        canUseSmartphone,
        createdAt: new Date().toISOString(),
      };

      await setDoc(patientDocRef, {
        ...newPatient,
        serverCreatedAt: serverTimestamp(),
      });

      return newPatient;
    }
  }

  throw new Error('Failed to generate a unique Patient ID after multiple attempts. Please try again.');
}

/**
 * Retrieves a patient document by its KIN-XXXX-XXXX ID.
 */
export async function getPatient(patientId: string): Promise<Patient | null> {
  const patientDocRef = doc(db, 'patients', patientId);
  const snap = await getDoc(patientDocRef);
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as Patient;
}

/**
 * Fetches the active patient profile managed by the current family member.
 */
export async function getPatientForFamily(familyUid: string): Promise<Patient | null> {
  const q = query(collection(db, 'patients'), where('familyId', '==', familyUid));
  const snap = await getDocs(q);
  if (snap.empty) {
    return null;
  }
  return snap.docs[0].data() as Patient;
}

/**
 * Fetches all patient profiles managed by the current family member.
 */
export async function getPatientsForFamily(familyUid: string): Promise<Patient[]> {
  const q = query(collection(db, 'patients'), where('familyId', '==', familyUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Patient);
}

/**
 * Toggles patient access mode (Independent vs Assisted Care)
 * Writes an immutable activity log recording the mode switch.
 */
export async function togglePatientAccessMode(input: {
  patientId: string;
  canUseSmartphone: boolean;
}): Promise<{ patientId: string; mode: 'ASSISTED_CARE' | 'INDEPENDENT'; updatedAt: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }

  const { patientId, canUseSmartphone } = input;
  const patientDocRef = doc(db, 'patients', patientId);

  await updateDoc(patientDocRef, {
    canUseSmartphone,
    updatedAt: serverTimestamp(),
  });

  // Record mode switch in activity_logs
  const logDocRef = doc(collection(db, 'activity_logs'));
  await setDoc(logDocRef, {
    patientId,
    itemType: 'mode',
    itemId: patientId,
    action: canUseSmartphone ? 'MODE_SWITCHED_INDEPENDENT' : 'MODE_SWITCHED_ASSISTED',
    actorUid: currentUser.uid,
    actorRole: 'family',
    actorName: currentUser.displayName || 'Family Member',
    timestamp: serverTimestamp(),
  });

  return {
    patientId,
    mode: canUseSmartphone ? 'INDEPENDENT' : 'ASSISTED_CARE',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates patient login credentials using the secondary Firebase App instance.
 * Keeps the active family member signed in.
 */
export async function createPatientLogin(
  input: CreatePatientLoginInput
): Promise<{ patientUid: string; patientId: string }> {
  const currentFamilyUser = auth.currentUser;
  if (!currentFamilyUser) {
    throw new Error('Authentication required.');
  }

  const { patientId, name, email, tempPassword } = input;
  const secondaryAuth = getSecondaryAuth();

  // Create login on secondary app
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), tempPassword);
  const patientUid = cred.user.uid;

  // Sign out from secondary app so it stays clean
  await signOut(secondaryAuth);

  // Write users/{patientUid} document with role "patient"
  const userProfile: UserProfile = {
    uid: patientUid,
    role: 'patient',
    displayName: name.trim(),
    email: email.trim().toLowerCase(),
    patientId,
    familyId: currentFamilyUser.uid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', patientUid), {
    ...userProfile,
    serverCreatedAt: serverTimestamp(),
  });

  // Link patientUid in patients/{patientId}
  await updateDoc(doc(db, 'patients', patientId), {
    patientUid,
    canUseSmartphone: true,
  });

  return { patientUid, patientId };
}

