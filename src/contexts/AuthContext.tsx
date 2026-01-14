'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getUserByEmail, migrateUserGoals } from '@/lib/firestore-service';

export type UserRole = 'admin' | 'vendedor';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  category?: string;
  product?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to validate email domain
const isValidEmailDomain = (email: string | null, role: UserRole): boolean => {
  if (!email) return false;

  // Admins can use any email
  if (role === 'admin') return true;

  // Other users must use @avivacredito.com
  return email.endsWith('@avivacredito.com');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = {
            uid: user.uid,
            email: user.email || '',
            ...userDoc.data(),
          } as UserProfile;

          // Verify email domain
          if (!isValidEmailDomain(user.email, profile.role)) {
            console.error('Acceso denegado: dominio de email no autorizado');
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }

          setUserProfile(profile);
        } else {
          // Verify email domain for new users
          if (!isValidEmailDomain(user.email, 'vendedor')) {
            console.error('Acceso denegado: dominio de email no autorizado');
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }

          // Check if user was imported from CSV (has profile with different UID)
          const existingProfile = await getUserByEmail(user.email || '');

          if (existingProfile && existingProfile.id !== user.uid) {
            console.log('Migrando perfil de CSV import:', existingProfile.id, '→', user.uid);

            // Migrate user goals from old UID to new UID
            await migrateUserGoals(existingProfile.id, user.uid);

            // Create profile with correct UID using existing data
            const migratedProfile = {
              uid: user.uid,
              email: user.email || '',
              role: (existingProfile.role as UserRole) || 'vendedor',
              name: existingProfile.name || user.displayName || user.email?.split('@')[0] || 'Usuario',
              category: existingProfile.category,
              product: existingProfile.product,
              createdAt: existingProfile.createdAt || new Date().toISOString(),
              migratedFrom: existingProfile.id,
              migratedAt: new Date().toISOString(),
            };

            // Save migrated profile with correct UID
            await setDoc(doc(db, 'users', user.uid), migratedProfile);

            setUserProfile(migratedProfile);
          } else {
            // Create default profile for new Google users
            const defaultProfile = {
              uid: user.uid,
              email: user.email || '',
              role: 'vendedor' as UserRole,
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
              createdAt: new Date().toISOString(),
            };

            // Save to Firestore
            await setDoc(doc(db, 'users', user.uid), defaultProfile);

            setUserProfile(defaultProfile);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      // Check if email is from allowed domain
      if (!email?.endsWith('@avivacredito.com')) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const isAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';

        if (!isAdmin) {
          await firebaseSignOut(auth);
          throw new Error('Acceso denegado. Solo se permite el acceso a usuarios con correo @avivacredito.com');
        }
      }
    } catch (error: any) {
      // Re-throw the error so it can be caught by the login page
      throw error;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signOut,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
