import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

export interface CreateFamilyAccountInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Creates a new family account (Primary Controller)
 * Registers with Firebase Auth and creates the users/{uid} document with role "family".
 */
export async function createFamilyAccount(
  input: CreateFamilyAccountInput
): Promise<UserProfile> {
  const { name, email, password } = input;

  if (!name.trim()) {
    throw new Error('Name is required.');
  }
  if (!email.trim()) {
    throw new Error('Email is required.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // 1. Firebase Auth Registration
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = cred.user;

  // 2. Set Firebase Auth display name
  await updateProfile(user, { displayName: name.trim() });

  // 3. Create users/{uid} document strictly conforming to rules (role: "family", no patientId or familyId)
  const profile: UserProfile = {
    uid: user.uid,
    role: 'family',
    displayName: name.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    ...profile,
    serverCreatedAt: serverTimestamp(),
  });

  return profile;
}

export async function signInUser(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    throw new Error('User profile record not found in database.');
  }
  return profile;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as UserProfile;
}

