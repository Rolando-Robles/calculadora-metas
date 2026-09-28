import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db as maybeDb } from './firebase';
import { normalizeEmail } from './admin-utils';
import {
  GoalAchievementConfig,
  QualityMultiplierConfig,
  GrowthMultiplierConfig,
  UserGoalConfig,
} from './types';
import {
  GOAL_ACHIEVEMENT_LEVELS,
  QUALITY_MULTIPLIERS,
  GROWTH_MULTIPLIERS,
  RENEWAL_MULTIPLIERS,
} from './incentives-config';

// Firebase solo se inicializa en el navegador; estas funciones se llaman desde componentes cliente.
const db = maybeDb!;

// ===== INCENTIVE CONFIGURATION =====

export async function getIncentiveConfig() {
  const configDoc = await getDoc(doc(db, 'config', 'incentives'));
  if (configDoc.exists()) {
    return configDoc.data();
  }
  // Return defaults if not found
  return {
    goalAchievementLevels: GOAL_ACHIEVEMENT_LEVELS,
    qualityMultipliers: QUALITY_MULTIPLIERS,
    growthMultipliers: GROWTH_MULTIPLIERS,
    renewalMultipliers: RENEWAL_MULTIPLIERS,
  };
}

export async function updateIncentiveConfig(
  config: {
    goalAchievementLevels?: GoalAchievementConfig[];
    qualityMultipliers?: QualityMultiplierConfig[];
    growthMultipliers?: GrowthMultiplierConfig[];
    renewalMultipliers?: GrowthMultiplierConfig[];
  },
  actor?: string
) {
  await setDoc(
    doc(db, 'config', 'incentives'),
    { ...config, updatedAt: new Date().toISOString(), ...(actor ? { updatedBy: actor } : {}) },
    { merge: true }
  );
}

/**
 * Sobrescribe la configuración guardada con los valores por defecto del código.
 * (Antes solo escribía si el documento no existía, por lo que "Restaurar" no hacía nada.)
 */
export async function resetIncentiveConfigToDefaults(actor?: string) {
  await setDoc(doc(db, 'config', 'incentives'), {
    goalAchievementLevels: GOAL_ACHIEVEMENT_LEVELS,
    qualityMultipliers: QUALITY_MULTIPLIERS,
    growthMultipliers: GROWTH_MULTIPLIERS,
    renewalMultipliers: RENEWAL_MULTIPLIERS,
    updatedAt: new Date().toISOString(),
    ...(actor ? { updatedBy: actor } : {}),
  });
}

// ===== USER GOALS =====

/** Metas del vendedor. Las metas se guardan con el correo en minúsculas. */
export async function getUserGoals(userEmail: string) {
  const emailQuery = query(
    collection(db, 'userGoals'),
    where('userEmail', '==', normalizeEmail(userEmail))
  );
  const snapshot = await getDocs(emailQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
}
