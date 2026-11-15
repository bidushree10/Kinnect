import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, Patient } from '../types';
import { signInUser, signOutUser, createFamilyAccount, CreateFamilyAccountInput } from '../services/authService';
import { getPatient, getPatientForFamily } from '../services/patientService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  activePatient: Patient | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<UserProfile>;
  signUpFamily: (input: CreateFamilyAccountInput) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshPatient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndPatient = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);

        // Fetch patient based on role
        if (profile.role === 'family') {
          const patient = await getPatientForFamily(profile.uid);
          setActivePatient(patient);
        } else if (profile.patientId) {
          const patient = await getPatient(profile.patientId);
          setActivePatient(patient);
        }
      } else {
        setUserProfile(null);
        setActivePatient(null);
      }
    } catch {
      setUserProfile(null);
      setActivePatient(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfileAndPatient(user);
      } else {
        setUserProfile(null);
        setActivePatient(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshPatient = async () => {
    if (currentUser && userProfile) {
      if (userProfile.role === 'family') {
        const patient = await getPatientForFamily(userProfile.uid);
        setActivePatient(patient);
      } else if (userProfile.patientId) {
        const patient = await getPatient(userProfile.patientId);
        setActivePatient(patient);
      }
    }
  };

  const handleSignIn = async (email: string, pass: string) => {
    const profile = await signInUser(email, pass);
    setUserProfile(profile);
    if (profile.role === 'family') {
      const patient = await getPatientForFamily(profile.uid);
      setActivePatient(patient);
    } else if (profile.patientId) {
      const patient = await getPatient(profile.patientId);
      setActivePatient(patient);
    }
    return profile;
  };

  const handleSignUpFamily = async (input: CreateFamilyAccountInput) => {
    const profile = await createFamilyAccount(input);
    setUserProfile(profile);
    return profile;
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUserProfile(null);
    setActivePatient(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activePatient,
        loading,
        signIn: handleSignIn,
        signUpFamily: handleSignUpFamily,
        signOut: handleSignOut,
        refreshPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

