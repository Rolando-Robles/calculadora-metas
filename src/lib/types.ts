export type TimeRange = 'day' | 'week' | 'month';

export interface User {
  name: string;
  kiosco: string;
  product: string;
  avatarUrl: string;
  category?: UserCategory;
  goalAchievementLevel?: GoalAchievementLevel;
  qualityMultiplier?: QualityMultiplier;
  growthMultiplier?: GrowthMultiplier;
}

export interface Kpi {
  value: number;
  goal: number;
  label: string;
}

export interface KpiData {
  requests: Kpi;
  approved: Kpi;
  disbursed: Kpi;
  amount: Kpi;
}

export interface ChartData {
  date: string;
  value: number;
  goal: number;
}

export interface IncentivePeriod {
  period: string;
  baseCommission: number;
  multiplier: number;
  totalPaid: number;
  date: string;
}

export interface MonthlyCommission {
  month: string;
  commission: number;
}

// ===== Originadores de Excelencia Types =====

export type GoalAchievementLevel = string;

export type UserCategory = 'G0' | 'G1' | 'G2' | 'G3' | 'G4';

/**
 * Nivel Jaguar: nombres visibles de las categorías. G0 ya no es seleccionable
 * (los códigos internos G1-G4 se conservan para no romper datos existentes).
 */
export const CATEGORY_LABELS: Record<UserCategory, string> = {
  G0: 'G0',
  G1: 'Formación',
  G2: 'Territorio',
  G3: 'Consolidado',
  G4: 'Élite',
};

export const CATEGORIES: { value: UserCategory; label: string }[] = [
  { value: 'G1', label: CATEGORY_LABELS.G1 },
  { value: 'G2', label: CATEGORY_LABELS.G2 },
  { value: 'G3', label: CATEGORY_LABELS.G3 },
  { value: 'G4', label: CATEGORY_LABELS.G4 },
];

export type ProductType = 'aviva_contigo' | 'aviva_tu_negocio' | 'aviva_tu_compra' | 'casa_marchand' | 'construrama';

export const PRODUCTS: { value: ProductType; label: string }[] = [
  { value: 'aviva_contigo', label: 'Aviva Contigo' },
  { value: 'aviva_tu_negocio', label: 'Aviva Tu Negocio' },
  { value: 'aviva_tu_compra', label: 'Aviva Tu Compra' },
  { value: 'casa_marchand', label: 'Casa Marchand' },
  { value: 'construrama', label: 'Construrama' },
];

/** Productos donde el multiplicador de "Crecimiento" se mide como tasa de conversión de renovaciones */
export const RENEWAL_RATE_PRODUCTS: ProductType[] = ['aviva_contigo', 'aviva_tu_negocio', 'aviva_tu_compra'];

export type QualityMultiplier = 'A' | 'B' | 'C' | 'D';

export type GrowthMultiplier = 'A' | 'B' | 'C' | 'D';

export interface GoalAchievementConfig {
  level: GoalAchievementLevel;
  minPercentage: number;
  maxPercentage: number | null;
  label: string;
  bonusPercentages: {
    G0: number;
    G1: number;
    G2: number;
    G3: number;
    G4: number;
  };
}

export interface QualityMultiplierConfig {
  level: QualityMultiplier;
  value: number;
  label: string;
}

export interface GrowthMultiplierConfig {
  level: GrowthMultiplier;
  value: number;
  label: string;
}

export interface UserGoalConfig {
  userEmail: string; // Email del usuario (identificador único)
  monthlyGoal: number; // Meta mensual de colocación
  category: UserCategory;
  product?: ProductType;
  period: string; // e.g., "2024-01"
}

export interface IncentiveCalculation {
  colocacion: number; // Monto colocado
  meta: number; // Meta asignada
  achievementPercentage: number; // % de cumplimiento
  achievementLevel: GoalAchievementLevel;
  category: UserCategory;
  bonusBasePercentage: number; // % Bono Base según categoría y cumplimiento
  bonusBase: number; // Colocación × % Bono Base
  qualityMultiplier: QualityMultiplier;
  qualityMultiplierValue: number;
  growthMultiplier: GrowthMultiplier;
  growthMultiplierValue: number;
  bonusFinal: number; // Bono Base × Multiplicador Calidad × Multiplicador Crecimiento
}

export interface SalesProjection {
  month: string;
  projectedColocacion: number;
  projectedMeta: number;
  projectedBonus: number;
  category: UserCategory;
  qualityMultiplier: QualityMultiplier;
  growthMultiplier: GrowthMultiplier;
}
