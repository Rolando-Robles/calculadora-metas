'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { normalizeEmail } from '@/lib/admin-utils';
import { legacySlugId, mergeProfiles, type RawUserDoc } from '@/lib/profile-merge';
import type { UserRole } from '@/lib/types';

export type { UserRole } from '@/lib/types';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  category?: string;
  product?: string;
  region?: string;
  manager?: string;
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
  return normalizeEmail(email).endsWith('@avivacredito.com');
};

// Solo se actualiza lastLoginAt si el último registro tiene más de 12 horas.
const LAST_LOGIN_REFRESH_MS = 12 * 60 * 60 * 1000;

/**
 * Lee todos los documentos que pueden pertenecer a la persona: el actual
 * (`users/{correo}`), el de su uid y el alias del CSV anterior, y los fusiona.
 * Los de formato anterior pueden no existir o no ser legibles; se ignoran.
 */
async function loadOwnProfileDocs(user: User): Promise<{ docs: RawUserDoc[]; hasCanonical: boolean }> {
  const email = normalizeEmail(user.email);
  const ids = [...new Set([email, user.uid, legacySlugId(email)].filter(Boolean))];
  const snaps = await Promise.all(
    ids.map(id => getDoc(doc(db!, 'users', id)).catch(() => null))
  );
  const docs = snaps
    .filter(snap => snap?.exists())
    .map(snap => ({ id: snap!.id, data: snap!.data() as Record<string, any> }))
    // El alias del CSV podría coincidir con otra persona; solo se usa si es del mismo correo.
    .filter(d => d.id === user.uid || normalizeEmail(d.data.email || d.id) === email);
  return { docs, hasCanonical: docs.some(d => d.id === email) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const email = normalizeEmail(user.email);
        const { docs, hasCanonical } = await loadOwnProfileDocs(user);
        const merged = docs.length > 0 ? mergeProfiles(email, docs) : null;
        const role: UserRole = merged?.role ?? 'vendedor';

        if (!isValidEmailDomain(email, role)) {
          console.error('Acceso denegado: dominio de email no autorizado');
          await firebaseSignOut(auth!);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const now = new Date().toISOString();
        const name = merged?.name || user.displayName || email.split('@')[0] || 'Usuario';
        const canonicalRef = doc(db!, 'users', email);

        // El perfil vive en users/{correo}. Si el admin ya lo cargó, se liga el uid;
        // si no existe, se crea como vendedor sin categoría ni producto (los asigna el admin).
        if (!hasCanonical && email.endsWith('@avivacredito.com')) {
          await setDoc(canonicalRef, {
            email,
            uid: user.uid,
            name,
            role: 'vendedor',
            status: 'activo',
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          }).catch(err => console.error('No se pudo crear el perfil:', err));
        } else if (hasCanonical) {
          const canonical = docs.find(d => d.id === email)!.data;
          const lastLogin = Date.parse(canonical.lastLoginAt || '') || 0;
          if (canonical.uid !== user.uid || Date.now() - lastLogin > LAST_LOGIN_REFRESH_MS) {
            await updateDoc(canonicalRef, {
              uid: user.uid,
              lastLoginAt: now,
              updatedAt: now,
              ...(canonical.name ? {} : { name }),
            }).catch(err => console.error('No se pudo actualizar el último acceso:', err));
          }
        }

        setUserProfile({
          uid: user.uid,
          email,
          role,
          name,
          category: merged?.category,
          product: merged?.product,
          region: merged?.region,
          manager: merged?.manager,
        });
      } catch (error) {
        console.error('Error cargando el perfil:', error);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized');
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const email = normalizeEmail(result.user.email);

    // Check if email is from allowed domain
    if (!email.endsWith('@avivacredito.com')) {
      // Check if user is admin (perfil por correo o por uid del formato anterior)
      const { docs } = await loadOwnProfileDocs(result.user);
      const isAdmin = docs.some(d => d.data.role === 'admin');

      if (!isAdmin) {
        await firebaseSignOut(auth);
        throw new Error('Acceso denegado. Solo se permite el acceso a usuarios con correo @avivacredito.com');
      }
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
