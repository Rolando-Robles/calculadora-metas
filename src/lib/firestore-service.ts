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

export async function getUserGoals(userId: string) {
  const goalsQuery = query(
    collection(db, 'userGoals'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(goalsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
}

export async function getAllUserGoals() {
  const snapshot = await getDocs(collection(db, 'userGoals'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGoalConfig & { id: string }));
}

export async function saveUserGoal(goal: UserGoalConfig) {
  const goalId = `${goal.userId}-${goal.period}`;
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

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
