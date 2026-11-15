import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationItem } from '../types';

/**
 * Retrieves unread notifications for a family member.
 */
export async function getFamilyNotifications(familyId: string): Promise<NotificationItem[]> {
  const q = query(
    collection(db, 'notifications'),
    where('familyId', '==', familyId),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as NotificationItem);
}

/**
 * Subscribes to real-time notification alerts for a family member.
 */
export function subscribeFamilyNotifications(
  familyId: string,
  onUpdate: (notifications: NotificationItem[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('familyId', '==', familyId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as NotificationItem);
    onUpdate(list);
  });
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(notId: string): Promise<void> {
  const notRef = doc(db, 'notifications', notId);
  await updateDoc(notRef, {
    read: true,
    readAt: serverTimestamp(),
  });
}

/**
 * Marks all notifications for a family member as read.
 */
export async function markAllNotificationsAsRead(familyId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('familyId', '==', familyId),
    where('read', '==', false)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      read: true,
      readAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

