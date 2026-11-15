import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getSecondaryAuth } from '../lib/secondaryApp';
import { UserProfile, Patient, Medication, Appointment } from '../types';

export const DEMO_CREDENTIALS = {
  family: {
    email: 'family@kinnect.local',
    password: 'Password123!',
    displayName: 'Sarah Connor',
  },
  caretaker: {
    email: 'caretaker@kinnect.local',
    password: 'Password123!',
    displayName: 'Marcus Wright',
  },
  patient: {
    email: 'patient@kinnect.local',
    password: 'Password123!',
    displayName: 'Eleanor Vance',
  },
};

export const DEMO_PATIENT_ID = 'KIN-7H4K-9QX2';

export interface SeedDemoResult {
  patientId: string;
  demoAccounts: {
    family: string;
    caretaker: string;
    patient: string;
  };
}

/**
 * Idempotently seeds the demo environment.
 * Authenticates the demo family session first so that Firestore security rules are strictly met.
 */
export async function seedDemoEnvironment(): Promise<SeedDemoResult> {
  // 1. Sign in or Create Demo Family User first (so request.auth is established)
  let familyUid = '';
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      DEMO_CREDENTIALS.family.email,
      DEMO_CREDENTIALS.family.password
    );
    familyUid = cred.user.uid;
  } catch (err: unknown) {
    console.log('Demo family user not found by login, creating new demo account...', err);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        DEMO_CREDENTIALS.family.email,
        DEMO_CREDENTIALS.family.password
      );
      familyUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: DEMO_CREDENTIALS.family.displayName });

      const familyProfile: UserProfile = {
        uid: familyUid,
        role: 'family',
        displayName: DEMO_CREDENTIALS.family.displayName,
        email: DEMO_CREDENTIALS.family.email,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', familyUid), {
        ...familyProfile,
        serverCreatedAt: serverTimestamp(),
      });
    } catch (createErr) {
      console.warn('Could not create demo family user, continuing:', createErr);
    }
  }

  // 2. Check if demo patient already exists in Firestore (now authenticated)
  try {
    const demoPatientSnap = await getDoc(doc(db, 'patients', DEMO_PATIENT_ID));
    if (demoPatientSnap.exists()) {
      return {
        patientId: DEMO_PATIENT_ID,
        demoAccounts: {
          family: DEMO_CREDENTIALS.family.email,
          caretaker: DEMO_CREDENTIALS.caretaker.email,
          patient: DEMO_CREDENTIALS.patient.email,
        },
      };
    }
  } catch (snapErr) {
    console.warn('Patient check skipped:', snapErr);
  }

  if (!familyUid && auth.currentUser) {
    familyUid = auth.currentUser.uid;
  }

  // 3. Create Demo Patient Profile (Assisted Care mode by default)
  const patientData: Patient = {
    id: DEMO_PATIENT_ID,
    familyId: familyUid,
    name: DEMO_CREDENTIALS.patient.displayName,
    canUseSmartphone: false, // Assisted Care mode
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'patients', DEMO_PATIENT_ID), {
    ...patientData,
    serverCreatedAt: serverTimestamp(),
  });

  // 4. Create Demo Caretaker (using secondary auth so family remains signed in)
  const secondaryAuth = getSecondaryAuth();
  let caretakerUid = '';
  try {
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      DEMO_CREDENTIALS.caretaker.email,
      DEMO_CREDENTIALS.caretaker.password
    );
    caretakerUid = cred.user.uid;
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        DEMO_CREDENTIALS.caretaker.email,
        DEMO_CREDENTIALS.caretaker.password
      );
      caretakerUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: DEMO_CREDENTIALS.caretaker.displayName });
    } catch (cErr) {
      console.warn('Caretaker secondary creation note:', cErr);
    }
  }

  // Provision caretaker records if we have a UID
  if (caretakerUid) {
    await setDoc(doc(db, 'users', caretakerUid), {
      uid: caretakerUid,
      role: 'caretaker',
      displayName: DEMO_CREDENTIALS.caretaker.displayName,
      email: DEMO_CREDENTIALS.caretaker.email,
      patientId: DEMO_PATIENT_ID,
      familyId: familyUid,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'caretakers', caretakerUid), {
      uid: caretakerUid,
      patientId: DEMO_PATIENT_ID,
      familyId: familyUid,
      permissions: { canConfirm: true, canEditSchedules: false },
      active: true,
      displayName: DEMO_CREDENTIALS.caretaker.displayName,
      email: DEMO_CREDENTIALS.caretaker.email,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });
  }

  // 5. Create Demo Patient Login (using secondary auth)
  let patientUid = '';
  try {
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      DEMO_CREDENTIALS.patient.email,
      DEMO_CREDENTIALS.patient.password
    );
    patientUid = cred.user.uid;
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        DEMO_CREDENTIALS.patient.email,
        DEMO_CREDENTIALS.patient.password
      );
      patientUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: DEMO_CREDENTIALS.patient.displayName });
    } catch (pErr) {
      console.warn('Patient secondary creation note:', pErr);
    }
  }

  if (patientUid) {
    await setDoc(doc(db, 'users', patientUid), {
      uid: patientUid,
      role: 'patient',
      displayName: DEMO_CREDENTIALS.patient.displayName,
      email: DEMO_CREDENTIALS.patient.email,
      patientId: DEMO_PATIENT_ID,
      familyId: familyUid,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'patients', DEMO_PATIENT_ID),
      { patientUid },
      { merge: true }
    );
  }

  // 6. Seed Medications (Prescribed by family)
  const medMetformin: Medication = {
    id: 'med_demo_metformin',
    patientId: DEMO_PATIENT_ID,
    name: 'Metformin',
    strength: '500mg',
    dosage: '1 tablet',
    frequency: 'Daily',
    scheduledTime: '08:00',
    active: true,
    createdBy: familyUid,
    createdAt: new Date().toISOString(),
  };

  const medLisinopril: Medication = {
    id: 'med_demo_lisinopril',
    patientId: DEMO_PATIENT_ID,
    name: 'Lisinopril',
    strength: '10mg',
    dosage: '1 tablet',
    frequency: 'Daily',
    scheduledTime: '20:00',
    active: true,
    createdBy: familyUid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'medications', medMetformin.id), {
    ...medMetformin,
    serverCreatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'medications', medLisinopril.id), {
    ...medLisinopril,
    serverCreatedAt: serverTimestamp(),
  });

  // 7. Seed Appointment (Scheduled by family)
  const aptCardiology: Appointment = {
    id: 'apt_demo_cardiology',
    patientId: DEMO_PATIENT_ID,
    title: 'Cardiology Checkup',
    doctor: 'Dr. Robert Chen',
    location: 'City Heart Clinic, Suite 302',
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    status: 'unconfirmed',
    createdBy: familyUid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'appointments', aptCardiology.id), {
    ...aptCardiology,
    serverCreatedAt: serverTimestamp(),
  });

  // 8. Seed Initial Confirmation in Atomic Batch (signed in as family controller)
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const doseId = `${medMetformin.id}_${todayStr}`;
    const logId = `${doseId}_log`;
    const notId = `not_demo_${Date.now()}`;

    const batch = writeBatch(db);
    batch.set(doc(db, 'doses', doseId), {
      id: doseId,
      patientId: DEMO_PATIENT_ID,
      medId: medMetformin.id,
      date: todayStr,
      status: 'taken',
      confirmedByUid: familyUid,
      confirmedByRole: 'family',
      confirmedByName: DEMO_CREDENTIALS.family.displayName,
      confirmedAt: serverTimestamp(),
      logId,
    });

    batch.set(doc(db, 'activity_logs', logId), {
      id: logId,
      patientId: DEMO_PATIENT_ID,
      itemType: 'dose',
      itemId: doseId,
      action: 'DOSE_TAKEN',
      actorUid: familyUid,
      actorRole: 'family',
      actorName: DEMO_CREDENTIALS.family.displayName,
      timestamp: serverTimestamp(),
    });

    batch.set(doc(db, 'notifications', notId), {
      id: notId,
      familyId: familyUid,
      patientId: DEMO_PATIENT_ID,
      message: 'Metformin 500mg: Confirmed by Sarah Connor',
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (batchErr) {
    console.warn('Initial dose confirmation seed note:', batchErr);
  }

  return {
    patientId: DEMO_PATIENT_ID,
    demoAccounts: {
      family: DEMO_CREDENTIALS.family.email,
      caretaker: DEMO_CREDENTIALS.caretaker.email,
      patient: DEMO_CREDENTIALS.patient.email,
    },
  };
}

/**
 * Fast 1-click login for demo roles.
 */
export async function loginAsDemoRole(
  role: 'family' | 'caretaker' | 'patient'
): Promise<void> {
  const creds = DEMO_CREDENTIALS[role];
  try {
    await signInWithEmailAndPassword(auth, creds.email, creds.password);
  } catch {
    // If not existing yet, create user
    const cred = await createUserWithEmailAndPassword(auth, creds.email, creds.password);
    await updateProfile(cred.user, { displayName: creds.displayName });
  }
}
