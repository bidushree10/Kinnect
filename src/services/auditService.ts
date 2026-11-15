import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog } from '../types';

/**
 * Fetches recent activity logs for a patient (create-only audit trail).
 */
export async function getActivityLogs(
  patientId: string,
  limitCount = 50
): Promise<ActivityLog[]> {
  const q = query(
    collection(db, 'activity_logs'),
    where('patientId', '==', patientId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ActivityLog);
}

/**
 * Subscribes to real-time activity log updates for a patient.
 */
export function subscribeActivityLogs(
  patientId: string,
  onUpdate: (logs: ActivityLog[]) => void,
  limitCount = 50
): () => void {
  const q = query(
    collection(db, 'activity_logs'),
    where('patientId', '==', patientId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map((d) => d.data() as ActivityLog);
    onUpdate(logs);
  });
}

