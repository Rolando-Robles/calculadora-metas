import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
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
} from './incentives-config';

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
  };
}

export async function updateIncentiveConfig(config: {
  goalAchievementLevels?: GoalAchievementConfig[];
  qualityMultipliers?: QualityMultiplierConfig[];
  growthMultipliers?: GrowthMultiplierConfig[];
}) {
  await setDoc(doc(db, 'config', 'incentives'), config, { merge: true });
}

export async function initializeDefaultConfig() {
  const configDoc = await getDoc(doc(db, 'config', 'incentives'));
  if (!configDoc.exists()) {
    await setDoc(doc(db, 'config', 'incentives'), {
      goalAchievementLevels: GOAL_ACHIEVEMENT_LEVELS,
      qualityMultipliers: QUALITY_MULTIPLIERS,
      growthMultipliers: GROWTH_MULTIPLIERS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

// ===== USER GOALS =====

export async function getUserGoals(userEmail: string) {
  // Buscar primero por userEmail (nuevo formato)
  const emailQuery = query(
    collection(db, 'userGoals'),
    where('userEmail', '==', userEmail)
  );
  const emailSnapshot = await getDocs(emailQuery);

  if (!emailSnapshot.empty) {
    return emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
  }

  // Si no se encuentra, buscar por userId (formato antiguo para compatibilidad)
  // Extraer el UID del email para buscar metas antiguas
  const userId = userEmail.replace('@avivacredito.com', '').replace(/[^a-zA-Z0-9]/g, '_');
  const uidQuery = query(
    collection(db, 'userGoals'),
    where('userId', '==', userId)
  );
  const uidSnapshot = await getDocs(uidQuery);

  return uidSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
}

export async function getAllUserGoals() {
  const snapshot = await getDocs(collection(db, 'userGoals'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
}

export async function saveUserGoal(goal: UserGoalConfig) {
  const goalId = `${goal.userEmail.replace('@', '_at_').replace(/\./g, '_')}-${goal.period}`;
  await setDoc(doc(db, 'userGoals', goalId), {
    ...goal,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateUserGoal(goalId: string, updates: Partial<UserGoalConfig>) {
  await updateDoc(doc(db, 'userGoals', goalId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ===== USER MANAGEMENT =====

export async function getUserProfile(userId: string) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? userDoc.data() : null;
}

export async function updateUserProfile(userId: string, data: any) {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

// Create or update user profile (for CSV import and new users)
export async function createOrUpdateUserProfile(userId: string, data: any) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const isNewUser = !userDoc.exists();

  await setDoc(
    doc(db, 'users', userId),
    {
      ...data,
      updatedAt: new Date().toISOString(),
      ...(isNewUser ? { createdAt: new Date().toISOString() } : {}),
    },
    { merge: true }
  );
}

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Migrar metas antiguas con userId a userEmail
export async function migrateUserGoalsToEmail(userId: string, userEmail: string) {
  try {
    const goalsQuery = query(
      collection(db, 'userGoals'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(goalsQuery);

    const migrationPromises = snapshot.docs.map(async (goalDoc) => {
      const goalData = goalDoc.data();

      // Solo migrar si no tiene userEmail
      if (!goalData.userEmail) {
        await updateDoc(doc(db, 'userGoals', goalDoc.id), {
          userEmail: userEmail,
          migratedAt: new Date().toISOString(),
        });
        console.log(`✅ Migrated goal ${goalDoc.id} to email: ${userEmail}`);
      }
    });

    await Promise.all(migrationPromises);
    return true;
  } catch (error) {
    console.error('Error migrating user goals:', error);
    return false;
  }
}
