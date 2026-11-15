import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
 * If demo accounts and records already exist, it safely reuses them without duplicating data.
 * Adheres strictly to security rules by using authenticated client calls and secondary auth instances.
 */
export async function seedDemoEnvironment(): Promise<SeedDemoResult> {
  // Check if demo patient already exists in Firestore
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

  // 1. Sign in or Create Demo Family User
  let familyUid = '';
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      DEMO_CREDENTIALS.family.email,
      DEMO_CREDENTIALS.family.password
    );
    familyUid = cred.user.uid;
  } catch {
    // If not existing, create family user
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
  }

  // 2. Create Demo Patient Profile (Assisted Care mode by default)
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

  // 3. Create Demo Caretaker (using secondary auth so family remains signed in)
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
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      DEMO_CREDENTIALS.caretaker.email,
      DEMO_CREDENTIALS.caretaker.password
    );
    caretakerUid = cred.user.uid;
    await updateProfile(cred.user, { displayName: DEMO_CREDENTIALS.caretaker.displayName });
  }

  // Provision caretaker records
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

  // 4. Create Demo Patient Login (using secondary auth)
  let patientUid = '';
  try {
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      DEMO_CREDENTIALS.patient.email,
      DEMO_CREDENTIALS.patient.password
    );
    patientUid = cred.user.uid;
  } catch {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      DEMO_CREDENTIALS.patient.email,
      DEMO_CREDENTIALS.patient.password
    );
    patientUid = cred.user.uid;
    await updateProfile(cred.user, { displayName: DEMO_CREDENTIALS.patient.displayName });
  }

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

  // Update patient record with patientUid
  await setDoc(
    doc(db, 'patients', DEMO_PATIENT_ID),
    { patientUid },
    { merge: true }
  );

  // 5. Seed Medications (Prescribed by family)
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

  // 6. Seed Appointment (Scheduled by family)
  const aptCardiology: Appointment = {
    id: 'apt_demo_cardiology',
    patientId: DEMO_PATIENT_ID,
    title: 'Cardiology Checkup',
    doctor: 'Dr. Robert Chen',
    location: 'City Heart Clinic, Suite 302',
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow at same time
    status: 'unconfirmed',
    createdBy: familyUid,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'appointments', aptCardiology.id), {
    ...aptCardiology,
    serverCreatedAt: serverTimestamp(),
  });

  // 7. Seed Initial Confirmation by Caretaker (using secondary auth session to adhere to rules)
  const todayStr = new Date().toISOString().slice(0, 10);
  const doseId = `${medMetformin.id}_${todayStr}`;
  const logId = `${doseId}_log`;
  const notId = `not_demo_${Date.now()}`;

  // Make sure secondary auth is signed in as caretaker
  await signInWithEmailAndPassword(
    secondaryAuth,
    DEMO_CREDENTIALS.caretaker.email,
    DEMO_CREDENTIALS.caretaker.password
  );

  const batch = writeBatch(db);
  batch.set(doc(db, 'doses', doseId), {
    id: doseId,
    patientId: DEMO_PATIENT_ID,
    medId: medMetformin.id,
    date: todayStr,
    status: 'taken',
    confirmedByUid: caretakerUid,
    confirmedByRole: 'caretaker',
    confirmedByName: DEMO_CREDENTIALS.caretaker.displayName,
    confirmedAt: serverTimestamp(),
    logId,
  });

  batch.set(doc(db, 'activity_logs', logId), {
    id: logId,
    patientId: DEMO_PATIENT_ID,
    itemType: 'dose',
    itemId: doseId,
    action: 'DOSE_TAKEN',
    actorUid: caretakerUid,
    actorRole: 'caretaker',
    actorName: DEMO_CREDENTIALS.caretaker.displayName,
    timestamp: serverTimestamp(),
  });

  batch.set(doc(db, 'notifications', notId), {
    id: notId,
    familyId: familyUid,
    patientId: DEMO_PATIENT_ID,
    message: 'Metformin 500mg: Confirmed by Caretaker Marcus Wright at 08:04 AM',
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  // Clean up secondary auth
  await signOut(secondaryAuth);

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
  await signInWithEmailAndPassword(auth, creds.email, creds.password);
}

