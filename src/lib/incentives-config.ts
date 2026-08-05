import type {
  GoalAchievementConfig,
  QualityMultiplierConfig,
  GrowthMultiplierConfig,
  GoalAchievementLevel,
  UserCategory,
  QualityMultiplier,
  GrowthMultiplier,
  ProductType,
} from './types';
import { RENEWAL_RATE_PRODUCTS } from './types';

/**
 * Configuración de niveles de cumplimiento de meta
 * Basado en las tablas de "Originadores de Excelencia"
 */
export const GOAL_ACHIEVEMENT_LEVELS: GoalAchievementConfig[] = [
  {
    level: 'fuera_de_juego',
    minPercentage: 0,
    maxPercentage: 80,
    label: 'Fuera de juego',
    bonusPercentages: {
      G0: 0,
      G1: 0,
      G2: 0,
      G3: 0,
      G4: 0,
    },
  },
  {
    level: 'en_juego',
    minPercentage: 80,
    maxPercentage: 90,
    label: 'En Juego',
    bonusPercentages: {
      G0: 0,
      G1: 1.2,
      G2: 1.6,
      G3: 2.0,
      G4: 2.4,
    },
  },
  {
    level: 'cumplido',
    minPercentage: 100,
    maxPercentage: 109,
    label: 'Cumplido',
    bonusPercentages: {
      G0: 0,
      G1: 1.8,
      G2: 2.3,
      G3: 2.8,
      G4: 3.3,
    },
  },
  {
    level: 'dominado',
    minPercentage: 110,
    maxPercentage: 119,
    label: 'Dominado',
    bonusPercentages: {
      G0: 0,
      G1: 2.6,
      G2: 3.2,
      G3: 3.8,
      G4: 4.4,
    },
  },
  {
    level: 'sobresaliente',
    minPercentage: 120,
    maxPercentage: 160,
    label: 'Sobresaliente',
    bonusPercentages: {
      G0: 0,
      G1: 3.8,
      G2: 4.6,
      G3: 5.4,
      G4: 6.2,
    },
  },
  {
    level: 'nuevo_nivel',
    minPercentage: 0,
    maxPercentage: 0,
    label: '',
    bonusPercentages: {
      G0: 0,
      G1: 0,
      G2: 0,
      G3: 0,
      G4: 0,
    },
  },
  {
    level: 'elite',
    minPercentage: 160,
    maxPercentage: null,
    label: 'Elite',
    bonusPercentages: {
      G0: 0,
      G1: 5.0,
      G2: 5.8,
      G3: 6.4,
      G4: 7.0,
    },
  },
];

/**
 * Configuración de multiplicadores de calidad
 */
export const QUALITY_MULTIPLIERS: QualityMultiplierConfig[] = [
  {
    level: 'A',
    value: 1.20,
    label: 'Calidad A - Excelente',
  },
  {
    level: 'B',
    value: 1.00,
    label: 'Calidad B - Buena',
  },
  {
    level: 'C',
    value: 0.60,
    label: 'Calidad C - Regular',
  },
  {
    level: 'D',
    value: 0.00,
    label: 'Calidad D - Deficiente',
  },
];

/**
 * Configuración de multiplicadores de crecimiento
 */
export const GROWTH_MULTIPLIERS: GrowthMultiplierConfig[] = [
  {
    level: 'A',
    value: 1.15,
    label: 'Crecimiento A - Excelente',
  },
  {
    level: 'B',
    value: 1.00,
    label: 'Crecimiento B - Bueno',
  },
  {
    level: 'C',
    value: 0.80,
    label: 'Crecimiento C - Regular',
  },
  {
    level: 'D',
    value: 0.60,
    label: 'Crecimiento D - Bajo',
  },
];

/**
 * Configuración de multiplicadores de renovaciones (Nano, ATN, Cashi).
 * Es una tabla independiente de Crecimiento: mismos niveles A-D, pero con
 * sus propios porcentajes editables desde el panel de administración.
 */
export const RENEWAL_MULTIPLIERS: GrowthMultiplierConfig[] = [
  {
    level: 'A',
    value: 1.15,
    label: 'Renovación A - Excelente',
  },
  {
    level: 'B',
    value: 1.00,
    label: 'Renovación B - Bueno',
  },
  {
    level: 'C',
    value: 0.80,
    label: 'Renovación C - Regular',
  },
  {
    level: 'D',
    value: 0.60,
    label: 'Renovación D - Bajo',
  },
];

/**
 * Para Nano, ATN y Cashi el multiplicador de "Crecimiento" mide la tasa de
 * conversión de renovaciones, no el crecimiento del portafolio.
 */
export function getGrowthMetricLabels(product?: ProductType) {
  if (product && RENEWAL_RATE_PRODUCTS.includes(product)) {
    return {
      title: 'Tasa de Conversión de Renovaciones',
      shortLabel: 'Renovaciones',
      abbreviation: 'Renov.',
      description: 'Reconoce lograr que clientes satisfechos vuelvan a solicitar crédito.',
    };
  }
  return {
    title: 'Crecimiento',
    shortLabel: 'Crecimiento',
    abbreviation: 'Crec.',
    description: 'El servicio y lealtad del cliente se reflejan en renovaciones y crecimiento.',
  };
}

/**
 * Elige la tabla de multiplicadores que aplica según el producto: Renovaciones
 * para Nano/ATN/Cashi, Crecimiento para el resto.
 */
export function getApplicableGrowthMultipliers(
  product: ProductType | undefined,
  growthMults: GrowthMultiplierConfig[] = GROWTH_MULTIPLIERS,
  renewalMults: GrowthMultiplierConfig[] = RENEWAL_MULTIPLIERS
): GrowthMultiplierConfig[] {
  if (product && RENEWAL_RATE_PRODUCTS.includes(product)) {
    return renewalMults;
  }
  return growthMults;
}

/**
 * Obtiene la configuración de nivel de cumplimiento según el porcentaje
 */
export function getGoalAchievementLevel(
  achievementPercentage: number,
  goalLevels: GoalAchievementConfig[] = GOAL_ACHIEVEMENT_LEVELS
): GoalAchievementConfig {
  for (const level of goalLevels) {
    if (level.maxPercentage === null) {
      if (achievementPercentage >= level.minPercentage) {
        return level;
      }
    } else {
      if (achievementPercentage >= level.minPercentage && achievementPercentage < level.maxPercentage) {
        return level;
      }
    }
  }
  return goalLevels[0]; // Por defecto: fuera de juego
}

/**
 * Obtiene el valor del multiplicador de calidad
 */
export function getQualityMultiplierValue(
  level: QualityMultiplier,
  qualityMults: QualityMultiplierConfig[] = QUALITY_MULTIPLIERS
): number {
  const config = qualityMults.find(m => m.level === level);
  return config?.value ?? 1.0;
}

/**
 * Obtiene el valor del multiplicador de crecimiento
 */
export function getGrowthMultiplierValue(
  level: GrowthMultiplier,
  growthMults: GrowthMultiplierConfig[] = GROWTH_MULTIPLIERS
): number {
  const config = growthMults.find(m => m.level === level);
  return config?.value ?? 1.0;
}

/**
 * Calcula el bono base según la colocación, nivel de cumplimiento y categoría
 */
export function calculateBonusBase(
  colocacion: number,
  achievementPercentage: number,
  category: UserCategory,
  goalLevels: GoalAchievementConfig[] = GOAL_ACHIEVEMENT_LEVELS
): { bonusBase: number; bonusBasePercentage: number; achievementLevel: GoalAchievementLevel } {
  const levelConfig = getGoalAchievementLevel(achievementPercentage, goalLevels);
  const bonusBasePercentage = levelConfig.bonusPercentages[category];
  const bonusBase = colocacion * (bonusBasePercentage / 100);

  return {
    bonusBase,
    bonusBasePercentage,
    achievementLevel: levelConfig.level,
  };
}

/**
 * Calcula el bono final aplicando todos los multiplicadores
 * Fórmula: Bono Final = Colocación × % Bono Base × Multiplicador Calidad × Multiplicador Crecimiento
 */
export function calculateFinalBonus(
  colocacion: number,
  meta: number,
  category: UserCategory,
  qualityMultiplier: QualityMultiplier,
  growthMultiplier: GrowthMultiplier,
  goalLevels: GoalAchievementConfig[] = GOAL_ACHIEVEMENT_LEVELS,
  qualityMults: QualityMultiplierConfig[] = QUALITY_MULTIPLIERS,
  growthMults: GrowthMultiplierConfig[] = GROWTH_MULTIPLIERS
): {
  bonusFinal: number;
  bonusBase: number;
  bonusBasePercentage: number;
  achievementPercentage: number;
  achievementLevel: GoalAchievementLevel;
  qualityMultiplierValue: number;
  growthMultiplierValue: number;
} {
  const achievementPercentage = meta > 0 ? (colocacion / meta) * 100 : 0;
  const { bonusBase, bonusBasePercentage, achievementLevel } = calculateBonusBase(
    colocacion,
    achievementPercentage,
    category,
    goalLevels
  );

  const qualityMultiplierValue = getQualityMultiplierValue(qualityMultiplier, qualityMults);
  const growthMultiplierValue = getGrowthMultiplierValue(growthMultiplier, growthMults);

  const bonusFinal = bonusBase * qualityMultiplierValue * growthMultiplierValue;

  return {
    bonusFinal,
    bonusBase,
    bonusBasePercentage,
    achievementPercentage,
    achievementLevel,
    qualityMultiplierValue,
    growthMultiplierValue,
  };
}
