import { useState, useEffect } from 'react';
import { getIncentiveConfig } from '@/lib/firestore-service';
import type {
  GoalAchievementConfig,
  QualityMultiplierConfig,
  GrowthMultiplierConfig,
} from '@/lib/types';
import {
  GOAL_ACHIEVEMENT_LEVELS,
  QUALITY_MULTIPLIERS,
  GROWTH_MULTIPLIERS,
} from '@/lib/incentives-config';

export function useIncentiveConfig() {
  const [goalLevels, setGoalLevels] = useState<GoalAchievementConfig[]>(GOAL_ACHIEVEMENT_LEVELS);
  const [qualityMults, setQualityMults] = useState<QualityMultiplierConfig[]>(QUALITY_MULTIPLIERS);
  const [growthMults, setGrowthMults] = useState<GrowthMultiplierConfig[]>(GROWTH_MULTIPLIERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getIncentiveConfig();
        setGoalLevels(config.goalAchievementLevels || GOAL_ACHIEVEMENT_LEVELS);
        setQualityMults(config.qualityMultipliers || QUALITY_MULTIPLIERS);
        setGrowthMults(config.growthMultipliers || GROWTH_MULTIPLIERS);
      } catch (err) {
        console.error('Error loading incentive config:', err);
        setError(err as Error);
        // Use defaults on error
        setGoalLevels(GOAL_ACHIEVEMENT_LEVELS);
        setQualityMults(QUALITY_MULTIPLIERS);
        setGrowthMults(GROWTH_MULTIPLIERS);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  return { goalLevels, qualityMults, growthMults, loading, error };
}
