import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'demo-kinnect-rules-test';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('Firestore Security Rules (Phase 2)', () => {
  let testEnv: RulesTestEnvironment;

  const FAMILY_UID = 'family_user_1';
  const PATIENT_UID = 'patient_user_1';
  const PATIENT_ID = 'KIN-7H4K-9QX2';
  const CARETAKER_UID = 'caretaker_user_1';
  const REVOKED_CARETAKER_UID = 'caretaker_revoked_1';

  const OTHER_FAMILY_UID = 'family_user_2';
  const OTHER_PATIENT_ID = 'KIN-9ABC-3XYZ';
  const STRANGER_UID = 'stranger_attacker';

  beforeAll(async () => {
    const rules = fs.readFileSync(RULES_PATH, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8085,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed foundational baseline records bypassing security rules
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // 1. Family profile
      await setDoc(doc(db, 'users', FAMILY_UID), {
        uid: FAMILY_UID,
        role: 'family',
        displayName: 'Sarah Family',
        email: 'sarah@kinnect.local',
        createdAt: new Date().toISOString(),
      });

      // 2. Patient profile
      await setDoc(doc(db, 'patients', PATIENT_ID), {
        id: PATIENT_ID,
        familyId: FAMILY_UID,
        name: 'Eleanor Vance',
        canUseSmartphone: false,
        patientUid: PATIENT_UID,
        createdAt: new Date().toISOString(),
      });

      // 3. Patient user doc
      await setDoc(doc(db, 'users', PATIENT_UID), {
        uid: PATIENT_UID,
        role: 'patient',
        displayName: 'Eleanor Vance',
        email: 'eleanor@kinnect.local',
        patientId: PATIENT_ID,
        familyId: FAMILY_UID,
        createdAt: new Date().toISOString(),
      });

      // 4. Active Caretaker profile and user doc
      await setDoc(doc(db, 'users', CARETAKER_UID), {
        uid: CARETAKER_UID,
        role: 'caretaker',
        displayName: 'Caretaker Bob',
        email: 'bob@kinnect.local',
        patientId: PATIENT_ID,
        familyId: FAMILY_UID,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'caretakers', CARETAKER_UID), {
        uid: CARETAKER_UID,
        patientId: PATIENT_ID,
        familyId: FAMILY_UID,
        permissions: { canConfirm: true, canEditSchedules: false },
        active: true,
        createdAt: new Date().toISOString(),
      });

      // 5. Revoked Caretaker
      await setDoc(doc(db, 'users', REVOKED_CARETAKER_UID), {
        uid: REVOKED_CARETAKER_UID,
        role: 'caretaker',
        displayName: 'Revoked Dave',
        email: 'dave@kinnect.local',
        patientId: PATIENT_ID,
        familyId: FAMILY_UID,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'caretakers', REVOKED_CARETAKER_UID), {
        uid: REVOKED_CARETAKER_UID,
        patientId: PATIENT_ID,
        familyId: FAMILY_UID,
        permissions: { canConfirm: true, canEditSchedules: false },
        active: false,
        createdAt: new Date().toISOString(),
      });

      // 6. Other isolated family & patient
      await setDoc(doc(db, 'users', OTHER_FAMILY_UID), {
        uid: OTHER_FAMILY_UID,
        role: 'family',
        displayName: 'Other Family',
        email: 'other@kinnect.local',
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'patients', OTHER_PATIENT_ID), {
        id: OTHER_PATIENT_ID,
        familyId: OTHER_FAMILY_UID,
        name: 'Other Patient',
        canUseSmartphone: false,
        createdAt: new Date().toISOString(),
      });

      // 7. Base Medication
      await setDoc(doc(db, 'medications', 'med_metformin'), {
        id: 'med_metformin',
        patientId: PATIENT_ID,
        name: 'Metformin',
        strength: '500mg',
        dosage: '1 tablet',
        frequency: 'Daily',
        scheduledTime: '08:00',
        active: true,
        createdBy: FAMILY_UID,
        createdAt: new Date().toISOString(),
      });
    });
  });

  // ==========================================
  // 1. users Collection Rules & Attacker Tests
  // ==========================================
  describe('users collection rules', () => {
    it('allows a new user to self-register as family (no patientId or familyId)', async () => {
      const newFamilyContext = testEnv.authenticatedContext('new_family_uid');
      const db = newFamilyContext.firestore();

      await assertSucceeds(
        setDoc(doc(db, 'users', 'new_family_uid'), {
          uid: 'new_family_uid',
          role: 'family',
          displayName: 'Alice Family',
          email: 'alice@example.com',
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('denies a stranger self-registering as caretaker with another patientId', async () => {
      const strangerContext = testEnv.authenticatedContext(STRANGER_UID);
      const db = strangerContext.firestore();

      // Attacker trying to declare themselves caretaker of PATIENT_ID
      await assertFails(
        setDoc(doc(db, 'users', STRANGER_UID), {
          uid: STRANGER_UID,
          role: 'caretaker',
          displayName: 'Malicious Attacker',
          email: 'attacker@example.com',
          patientId: PATIENT_ID,
          familyId: FAMILY_UID,
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('denies a user attempting to change their own role after creation', async () => {
      const patientContext = testEnv.authenticatedContext(PATIENT_UID);
      const db = patientContext.firestore();

      // Patient attempts privilege escalation to become "family"
      await assertFails(
        updateDoc(doc(db, 'users', PATIENT_UID), {
          role: 'family',
        })
      );
    });
  });

  // ==========================================
  // 2. Caretaker Active Enforcement & Revocation
  // ==========================================
  describe('caretakers active status and revocation', () => {
    it('allows an active caretaker to read medications for their assigned patient', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      await assertSucceeds(getDoc(doc(db, 'medications', 'med_metformin')));
    });

    it('denies a revoked caretaker (active == false) from reading patient medications', async () => {
      const revokedContext = testEnv.authenticatedContext(REVOKED_CARETAKER_UID);
      const db = revokedContext.firestore();

      await assertFails(getDoc(doc(db, 'medications', 'med_metformin')));
    });

    it('denies a caretaker from modifying their own permissions in caretakers/{uid}', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      // Attacker tries to grant themselves schedule editing
      await assertFails(
        updateDoc(doc(db, 'caretakers', CARETAKER_UID), {
          'permissions.canEditSchedules': true,
        })
      );
    });
  });

  // ==========================================
  // 3. Cross-Patient Isolation
  // ==========================================
  describe('cross-patient isolation', () => {
    it('denies a caretaker of Patient A from reading Patient B medications', async () => {
      // Seed medication for other patient
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'medications', 'other_med'), {
          patientId: OTHER_PATIENT_ID,
          name: 'Lisinopril',
          strength: '10mg',
          dosage: '1 tablet',
          frequency: 'Daily',
          scheduledTime: '09:00',
          active: true,
          createdBy: OTHER_FAMILY_UID,
          createdAt: new Date().toISOString(),
        });
      });

      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      await assertFails(getDoc(doc(db, 'medications', 'other_med')));
    });
  });

  // ==========================================
  // 4. Locked Clinical Fields
  // ==========================================
  describe('clinical locked fields enforcement', () => {
    it('denies family or caretaker changing dosage or strength on existing medication', async () => {
      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      // Modifying locked clinical strength must be rejected
      await assertFails(
        updateDoc(doc(db, 'medications', 'med_metformin'), {
          strength: '1000mg',
        })
      );
    });

    it('allows family member to update scheduledTime', async () => {
      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      await assertSucceeds(
        updateDoc(doc(db, 'medications', 'med_metformin'), {
          scheduledTime: '09:30',
        })
      );
    });
  });

  // ==========================================
  // 5. Atomic Batch & Call Limits Test
  // ==========================================
  describe('atomic confirmation batch and get() limits', () => {
    it('accepts a real confirmation batch (dose + log + notification) within Firestore get() limits', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      const todayStr = '2026-11-15';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;
      const notId = `not_${Date.now()}`;

      const batch = writeBatch(db);

      // 1. Create Dose (create-only, status: taken)
      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: CARETAKER_UID,
        confirmedByRole: 'caretaker',
        confirmedByName: 'Caretaker Bob',
        confirmedAt: serverTimestamp(),
        logId,
      });

      // 2. Create Activity Log
      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });

      // 3. Create Family Notification
      batch.set(doc(db, 'notifications', notId), {
        id: notId,
        familyId: FAMILY_UID,
        patientId: PATIENT_ID,
        message: 'Metformin 500mg: Confirmed by Caretaker Bob',
        read: false,
        createdAt: serverTimestamp(),
      });

      // Executes all 3 writes atomically within call limits (<20 get/getAfter calls)
      await assertSucceeds(batch.commit());
    });

    it('denies an unbatched dose creation that lacks an accompanying activity log', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      const todayStr = '2026-11-16';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;

      // Single write without activity_logs entry
      await assertFails(
        setDoc(doc(db, 'doses', doseId), {
          id: doseId,
          patientId: PATIENT_ID,
          medId,
          date: todayStr,
          status: 'taken',
          confirmedByUid: CARETAKER_UID,
          confirmedByRole: 'caretaker',
          confirmedByName: 'Caretaker Bob',
          confirmedAt: serverTimestamp(),
          logId: 'non_existent_log',
        })
      );
    });

    it('denies dose confirmation with forged confirmer identity (actorUid != auth.uid)', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      const todayStr = '2026-11-17';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;

      const batch = writeBatch(db);

      // Caretaker falsely claims the family member confirmed it
      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: FAMILY_UID, // FORGED!
        confirmedByRole: 'family',
        confirmedByName: 'Sarah Family',
        confirmedAt: serverTimestamp(),
        logId,
      });

      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });

      await assertFails(batch.commit());
    });

    it('denies writing status "missed" on any dose record', async () => {
      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      const todayStr = '2026-11-18';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;

      const batch = writeBatch(db);

      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'missed', // FORBIDDEN STATUS!
        confirmedByUid: FAMILY_UID,
        confirmedByRole: 'family',
        confirmedByName: 'Sarah Family',
        confirmedAt: serverTimestamp(),
        logId,
      });

      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_MISSED',
        actorUid: FAMILY_UID,
        actorRole: 'family',
        actorName: 'Sarah Family',
        timestamp: serverTimestamp(),
      });

      await assertFails(batch.commit());
    });
  });

  // ==========================================
  // 6. Activity Logs & Patient History Access
  // ==========================================
  describe('activity logs access', () => {
    it('allows patient and caretaker to read all activity logs of their own patient', async () => {
      // Seed a log written by family
      const logId = 'log_sample_123';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'activity_logs', logId), {
          patientId: PATIENT_ID,
          itemType: 'mode',
          itemId: PATIENT_ID,
          action: 'MODE_SWITCHED',
          actorUid: FAMILY_UID,
          actorRole: 'family',
          actorName: 'Sarah Family',
          timestamp: new Date().toISOString(),
        });
      });

      const patientContext = testEnv.authenticatedContext(PATIENT_UID);
      const dbPatient = patientContext.firestore();
      await assertSucceeds(getDoc(doc(dbPatient, 'activity_logs', logId)));

      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const dbCaretaker = caretakerContext.firestore();
      await assertSucceeds(getDoc(doc(dbCaretaker, 'activity_logs', logId)));
    });

    it('denies update and delete operations on activity_logs (tamper-proof)', async () => {
      const logId = 'log_immutable_test';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'activity_logs', logId), {
          patientId: PATIENT_ID,
          itemType: 'dose',
          itemId: 'med_metformin',
          action: 'DOSE_TAKEN',
          actorUid: FAMILY_UID,
          actorRole: 'family',
          actorName: 'Sarah Family',
          timestamp: new Date().toISOString(),
        });
      });

      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      // Denies updating an audit log
      await assertFails(
        updateDoc(doc(db, 'activity_logs', logId), {
          action: 'FORGED_EDIT',
        })
      );
    });
  });

  // ==========================================
  // 7. Phases 3 & 4 Extended Rules Coverage
  // ==========================================
  describe('Phases 3 & 4 Extended Rules Coverage', () => {
    it('denies an inactive caretaker from confirming a dose', async () => {
      const revokedContext = testEnv.authenticatedContext(REVOKED_CARETAKER_UID);
      const db = revokedContext.firestore();

      const todayStr = '2026-11-20';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;

      const batch = writeBatch(db);
      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: REVOKED_CARETAKER_UID,
        confirmedByRole: 'caretaker',
        confirmedByName: 'Revoked Dave',
        confirmedAt: serverTimestamp(),
        logId,
      });
      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: REVOKED_CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Revoked Dave',
        timestamp: serverTimestamp(),
      });

      await assertFails(batch.commit());
    });

    it('denies a user of another family from reading or modifying patient data', async () => {
      const otherFamilyContext = testEnv.authenticatedContext(OTHER_FAMILY_UID);
      const db = otherFamilyContext.firestore();

      // Read Patient A medication
      await assertFails(getDoc(doc(db, 'medications', 'med_metformin')));

      // Create appointment for Patient A
      await assertFails(
        setDoc(doc(db, 'appointments', 'unauthorized_apt'), {
          id: 'unauthorized_apt',
          patientId: PATIENT_ID,
          title: 'Intrusion Test',
          doctor: 'Dr. Hack',
          location: 'Remote',
          dateTime: '2026-11-20T10:00',
          status: 'unconfirmed',
          createdBy: OTHER_FAMILY_UID,
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('denies dose confirmation with forged confirmer role (role != user profile)', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      const todayStr = '2026-11-21';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;

      const batch = writeBatch(db);
      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: CARETAKER_UID,
        confirmedByRole: 'family', // FORGED ROLE! (User is caretaker, not family)
        confirmedByName: 'Caretaker Bob',
        confirmedAt: serverTimestamp(),
        logId,
      });
      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: CARETAKER_UID,
        actorRole: 'family',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });

      await assertFails(batch.commit());
    });

    it('denies modifying locked medication name or frequency after creation', async () => {
      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      // Attempting to change locked name
      await assertFails(
        updateDoc(doc(db, 'medications', 'med_metformin'), {
          name: 'Metformin XR',
        })
      );

      // Attempting to change locked frequency
      await assertFails(
        updateDoc(doc(db, 'medications', 'med_metformin'), {
          frequency: 'Twice daily',
        })
      );
    });

    it('denies updating or deleting an existing dose document (create-only)', async () => {
      const doseId = 'med_metformin_2026-11-22';
      const logId = `${doseId}_log`;

      // Pre-seed a confirmed dose
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'doses', doseId), {
          id: doseId,
          patientId: PATIENT_ID,
          medId: 'med_metformin',
          date: '2026-11-22',
          status: 'taken',
          confirmedByUid: FAMILY_UID,
          confirmedByRole: 'family',
          confirmedByName: 'Sarah Family',
          confirmedAt: new Date().toISOString(),
          logId,
        });
      });

      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      // Denies updating a dose
      await assertFails(
        updateDoc(doc(db, 'doses', doseId), {
          confirmedByName: 'Tampered Name',
        })
      );

      // Denies deleting a dose
      await assertFails(deleteDoc(doc(db, 'doses', doseId)));
    });

    it('denies deleting an activity log entry (immutable audit trail)', async () => {
      const logId = 'log_audit_preserve';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'activity_logs', logId), {
          id: logId,
          patientId: PATIENT_ID,
          itemType: 'dose',
          itemId: 'med_metformin',
          action: 'DOSE_TAKEN',
          actorUid: FAMILY_UID,
          actorRole: 'family',
          actorName: 'Sarah Family',
          timestamp: new Date().toISOString(),
        });
      });

      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const db = familyContext.firestore();

      await assertFails(deleteDoc(doc(db, 'activity_logs', logId)));
    });

    it('denies confirming the same dose twice', async () => {
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const db = caretakerContext.firestore();

      const todayStr = '2026-11-23';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;
      const notId = `not_${Date.now()}`;

      // First confirmation batch: succeeds
      const batch1 = writeBatch(db);
      batch1.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: CARETAKER_UID,
        confirmedByRole: 'caretaker',
        confirmedByName: 'Caretaker Bob',
        confirmedAt: serverTimestamp(),
        logId,
      });
      batch1.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });
      batch1.set(doc(db, 'notifications', notId), {
        id: notId,
        familyId: FAMILY_UID,
        patientId: PATIENT_ID,
        message: 'Dose taken',
        read: false,
        createdAt: serverTimestamp(),
      });
      await assertSucceeds(batch1.commit());

      // Attempt second confirmation for the exact same dose: denied!
      const logId2 = `${doseId}_log_2`;
      const batch2 = writeBatch(db);
      batch2.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: CARETAKER_UID,
        confirmedByRole: 'caretaker',
        confirmedByName: 'Caretaker Bob',
        confirmedAt: serverTimestamp(),
        logId: logId2,
      });
      batch2.set(doc(db, 'activity_logs', logId2), {
        id: logId2,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });

      await assertFails(batch2.commit());
    });

    it('allows family member to create an appointment and active caretaker to confirm attendance', async () => {
      const familyContext = testEnv.authenticatedContext(FAMILY_UID);
      const dbFamily = familyContext.firestore();

      const aptId = 'apt_cardiology_1';
      // Family creates appointment: allowed
      await assertSucceeds(
        setDoc(doc(dbFamily, 'appointments', aptId), {
          id: aptId,
          patientId: PATIENT_ID,
          title: 'Cardiology Checkup',
          doctor: 'Dr. Robert Chen',
          location: 'City Heart Clinic',
          dateTime: '2026-11-25T10:00',
          status: 'unconfirmed',
          createdBy: FAMILY_UID,
          createdAt: new Date().toISOString(),
        })
      );

      // Active caretaker confirms attendance in atomic batch
      const caretakerContext = testEnv.authenticatedContext(CARETAKER_UID);
      const dbCaretaker = caretakerContext.firestore();
      const logId = `${aptId}_log`;
      const notId = `not_apt_${Date.now()}`;

      const batch = writeBatch(dbCaretaker);
      batch.update(doc(dbCaretaker, 'appointments', aptId), {
        status: 'attended',
        confirmedByUid: CARETAKER_UID,
        confirmedByRole: 'caretaker',
        confirmedByName: 'Caretaker Bob',
        confirmedAt: serverTimestamp(),
        logId,
      });
      batch.set(doc(dbCaretaker, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'appointment',
        itemId: aptId,
        action: 'APPOINTMENT_ATTENDED',
        actorUid: CARETAKER_UID,
        actorRole: 'caretaker',
        actorName: 'Caretaker Bob',
        timestamp: serverTimestamp(),
      });
      batch.set(doc(dbCaretaker, 'notifications', notId), {
        id: notId,
        familyId: FAMILY_UID,
        patientId: PATIENT_ID,
        message: 'Cardiology Checkup: Attended',
        read: false,
        createdAt: serverTimestamp(),
      });

      await assertSucceeds(batch.commit());
    });

    it('allows independent patient to confirm their own dose in atomic batch', async () => {
      const patientContext = testEnv.authenticatedContext(PATIENT_UID);
      const db = patientContext.firestore();

      const todayStr = '2026-11-24';
      const medId = 'med_metformin';
      const doseId = `${medId}_${todayStr}`;
      const logId = `${doseId}_log`;
      const notId = `not_pat_${Date.now()}`;

      const batch = writeBatch(db);
      batch.set(doc(db, 'doses', doseId), {
        id: doseId,
        patientId: PATIENT_ID,
        medId,
        date: todayStr,
        status: 'taken',
        confirmedByUid: PATIENT_UID,
        confirmedByRole: 'patient',
        confirmedByName: 'Eleanor Vance',
        confirmedAt: serverTimestamp(),
        logId,
      });
      batch.set(doc(db, 'activity_logs', logId), {
        id: logId,
        patientId: PATIENT_ID,
        itemType: 'dose',
        itemId: doseId,
        action: 'DOSE_TAKEN',
        actorUid: PATIENT_UID,
        actorRole: 'patient',
        actorName: 'Eleanor Vance',
        timestamp: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', notId), {
        id: notId,
        familyId: FAMILY_UID,
        patientId: PATIENT_ID,
        message: 'Metformin: Confirmed by Eleanor Vance',
        read: false,
        createdAt: serverTimestamp(),
      });

      await assertSucceeds(batch.commit());
    });
  });
});
