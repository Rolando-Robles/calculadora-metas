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

// ===== Administración de vendedores =====

export type UserRole = 'admin' | 'vendedor';

/**
 * Perfil del vendedor. El documento vive en `users/{correo en minúsculas}`;
 * `uid` se llena la primera vez que la persona inicia sesión con Google.
 */
export interface VendorProfile {
  email: string;
  role: UserRole;
  uid?: string;
  name?: string;
  category?: UserCategory;
  product?: ProductType;
  region?: string;
  manager?: string;
  status?: 'activo' | 'baja';
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface UserGoalDoc extends UserGoalConfig {
  id: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PeriodLock {
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}
