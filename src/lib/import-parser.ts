import type { ProductType, UserCategory, UserGoalDoc } from './types';
import {
  categoryLabel,
  formatCurrency,
  isVendorEmail,
  normalizeEmail,
  parseAmount,
  parseCategory,
  parseProduct,
  productLabel,
  simplify,
} from './admin-utils';
import type { MergedProfile } from './profile-merge';
import type { GoalSnapshot, ProfileFields, RevertEntry, VendorChange } from './admin-service';

// ===== Lectura del archivo =====

/** Detecta el separador contando `,` `;` y tabulador fuera de comillas en la primera línea. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find(l => l.trim() && !/^sep=/i.test(l.trim())) || '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char in counts) counts[char]++;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

/** CSV según RFC 4180: comillas, comillas escapadas ("") y saltos de línea dentro de comillas. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = text.replace(/^﻿/, '');

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map(r => r.map(c => c.trim()))
    .filter((r, i) => !(i === 0 && r.length === 1 && /^sep=/i.test(r[0])))
    .filter(r => r.some(c => c !== ''));
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data
      .map(row => row.map(cellToString))
      .filter(r => r.some(c => c !== ''));
  }
  return parseCsv(await file.text());
}

// ===== Columnas =====

export type ImportField = 'email' | 'name' | 'category' | 'product' | 'goal' | 'region' | 'manager';

export const IMPORT_FIELDS: { key: ImportField; label: string; required: boolean; aliases: string[] }[] = [
  { key: 'email', label: 'Correo', required: true, aliases: ['correo', 'email', 'e-mail', 'mail', 'correo electronico'] },
  { key: 'goal', label: 'Meta mensual', required: false, aliases: ['meta mensual', 'meta', 'goal', 'monthly goal', 'meta del periodo'] },
  { key: 'category', label: 'Categoría', required: false, aliases: ['categoria', 'category', 'nivel', 'nivel jaguar'] },
  { key: 'product', label: 'Producto', required: false, aliases: ['producto', 'product'] },
  { key: 'name', label: 'Nombre', required: false, aliases: ['nombre', 'name', 'nombre completo'] },
  { key: 'region', label: 'Región', required: false, aliases: ['region', 'zona', 'plaza'] },
  { key: 'manager', label: 'Gerente', required: false, aliases: ['gerente', 'manager', 'supervisor', 'lider', 'correo gerente'] },
];

export type ColumnMapping = Record<ImportField, number>;

/** Mapea columnas por nombre exacto (sin acentos ni mayúsculas); -1 = no se usa. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const simplified = headers.map(h => simplify(h).replace(/\s+/g, ' '));
  const mapping = {} as ColumnMapping;
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    const index = simplified.findIndex((h, i) => !used.has(i) && field.aliases.includes(h));
    mapping[field.key] = index;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

// ===== Plan de importación (vista previa) =====

export type RowStatus = 'new' | 'update' | 'unchanged' | 'error';

export interface FieldDiff {
  label: string;
  before: string;
  after: string;
}

export interface ImportRowPlan {
  rowNumber: number;
  email: string;
  name: string;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  diffs: FieldDiff[];
  change?: VendorChange;
  revert?: RevertEntry;
}

export interface ImportPlan {
  rows: ImportRowPlan[];
  counts: Record<RowStatus, number>;
  warningCount: number;
  /** Vendedores con meta en el periodo que no vienen en el archivo. */
  notInFile: number;
}

const PROFILE_FIELD_LABELS: Record<keyof ProfileFields, string> = {
  name: 'Nombre',
  category: 'Categoría',
  product: 'Producto',
  region: 'Región',
  manager: 'Gerente',
};

const displayValue = (field: keyof ProfileFields, value?: string | null) => {
  if (!value) return '—';
  if (field === 'category') return categoryLabel(value);
  if (field === 'product') return productLabel(value);
  return value;
};

export function buildImportPlan(params: {
  rows: string[][];
  mapping: ColumnMapping;
  vendors: Map<string, MergedProfile>;
  goals: Map<string, UserGoalDoc>;
}): ImportPlan {
  const { rows, mapping, vendors, goals } = params;
  const dataRows = rows.slice(1);
  const seen = new Map<string, number>();
  const plan: ImportRowPlan[] = [];
  const cell = (row: string[], field: ImportField) =>
    mapping[field] >= 0 ? (row[mapping[field]] ?? '').trim() : '';

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 encabezado, +1 base 1 como en Excel
    const rawEmail = cell(row, 'email');
    const email = normalizeEmail(rawEmail);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email) errors.push('Falta el correo');
    else if (!isVendorEmail(email)) errors.push(`Correo inválido "${rawEmail}" (debe ser @avivacredito.com)`);
    else if (seen.has(email)) errors.push(`Correo duplicado: ya aparece en la fila ${seen.get(email)}`);
    if (email && !seen.has(email)) seen.set(email, rowNumber);

    const rawCategory = cell(row, 'category');
    const category = parseCategory(rawCategory);
    if (rawCategory && !category) {
      errors.push(`Categoría "${rawCategory}" no reconocida (formacion, territorio, consolidado, elite)`);
    }

    const rawProduct = cell(row, 'product');
    const product = parseProduct(rawProduct);
    if (rawProduct && !product) errors.push(`Producto "${rawProduct}" no reconocido`);

    const rawGoal = cell(row, 'goal');
    let goal: number | null = null;
    if (rawGoal) {
      const parsed = parseAmount(rawGoal);
      if (parsed === null) errors.push(`Meta "${rawGoal}" no es un número`);
      else if (parsed <= 0) errors.push('La meta debe ser mayor a 0');
      else goal = Math.round(parsed);
    }

    const existing = vendors.get(email);
    const existingGoal = goals.get(email);
    const effectiveCategory = (category || existing?.category) as UserCategory | undefined;
    const effectiveProduct = (product || existing?.product) as ProductType | undefined;

    if (goal !== null && !effectiveCategory) {
      errors.push('Falta la categoría (el vendedor no tiene una asignada)');
    }

    const name = cell(row, 'name') || existing?.name || email.split('@')[0] || '';

    if (errors.length > 0) {
      plan.push({ rowNumber, email: email || rawEmail, name, status: 'error', errors, warnings, diffs: [] });
      return;
    }

    // Cambios de perfil: solo campos que vienen en el archivo y son distintos.
    const incoming: ProfileFields = {
      name: cell(row, 'name') || undefined,
      category: category || undefined,
      product: product || undefined,
      region: cell(row, 'region') || undefined,
      manager: cell(row, 'manager').includes('@')
        ? normalizeEmail(cell(row, 'manager'))
        : cell(row, 'manager') || undefined,
    };
    const profile: ProfileFields = {};
    const profileBefore: Record<string, string | null> = {};
    const diffs: FieldDiff[] = [];
    (Object.keys(incoming) as (keyof ProfileFields)[]).forEach(field => {
      const value = incoming[field];
      const before = (existing?.[field] as string | undefined) || null;
      if (value && value !== before) {
        (profile as any)[field] = value;
        profileBefore[field] = before;
        diffs.push({ label: PROFILE_FIELD_LABELS[field], before: displayValue(field, before), after: displayValue(field, value) });
      }
    });

    // Meta del periodo: se guarda si cambia el monto, o si ya existe y cambió la
    // categoría/producto (la meta guarda esos datos como foto del periodo).
    let goalChange: VendorChange['goal'];
    const snapshotChanged =
      !!existingGoal &&
      (existingGoal.category !== effectiveCategory || (existingGoal.product || undefined) !== effectiveProduct);
    if (goal !== null && goal !== existingGoal?.monthlyGoal) {
      goalChange = { monthlyGoal: goal, category: effectiveCategory!, product: effectiveProduct };
      diffs.push({ label: 'Meta', before: formatCurrency(existingGoal?.monthlyGoal ?? null), after: formatCurrency(goal) });
      if (existingGoal?.monthlyGoal) {
        const delta = (goal - existingGoal.monthlyGoal) / existingGoal.monthlyGoal;
        if (Math.abs(delta) >= 0.5) {
          warnings.push(`La meta cambia ${delta > 0 ? '+' : ''}${Math.round(delta * 100)}% respecto a la actual`);
        }
      }
    } else if (snapshotChanged && effectiveCategory) {
      goalChange = { monthlyGoal: existingGoal!.monthlyGoal, category: effectiveCategory, product: effectiveProduct };
    }

    if (existing?.role === 'admin') warnings.push('Es administrador: su rol no se modifica');

    const createProfile = !existing?.hasCanonical;
    if (existing && createProfile) {
      diffs.push({ label: 'Perfil', before: 'Formato anterior', after: 'Formato actual (por correo)' });
    }
    const hasChanges = Object.keys(profile).length > 0 || goalChange !== undefined;
    const status: RowStatus = !existing ? 'new' : hasChanges || createProfile ? 'update' : 'unchanged';

    plan.push({
      rowNumber,
      email,
      name,
      status,
      errors,
      warnings,
      diffs,
      change:
        status === 'unchanged'
          ? undefined
          : {
              email,
              profile,
              createProfile: createProfile
                ? { role: existing?.role || 'vendedor', name: incoming.name || existing?.name || email.split('@')[0] }
                : undefined,
              goal: goalChange,
            },
      revert:
        status === 'unchanged'
          ? undefined
          : {
              email,
              profileExisted: !!existing?.hasCanonical,
              profileBefore,
              profileAfter: { ...profile } as Record<string, string>,
              goalTouched: goalChange !== undefined,
              goalBefore:
                goalChange !== undefined && existingGoal
                  ? {
                      monthlyGoal: existingGoal.monthlyGoal,
                      category: existingGoal.category,
                      ...(existingGoal.product ? { product: existingGoal.product } : {}),
                    }
                  : null,
              // Firestore rechaza `undefined`: solo se incluye cuando la importación escribe la meta.
              ...(goalChange
                ? {
                    goalAfter: {
                      monthlyGoal: goalChange.monthlyGoal,
                      category: goalChange.category,
                      ...(goalChange.product ? { product: goalChange.product } : {}),
                    },
                  }
                : {}),
            },
    });
  });

  const counts: Record<RowStatus, number> = { new: 0, update: 0, unchanged: 0, error: 0 };
  plan.forEach(r => counts[r.status]++);
  const inFile = new Set(plan.map(r => r.email));
  const notInFile = [...goals.keys()].filter(email => !inFile.has(email)).length;

  return {
    rows: plan,
    counts,
    warningCount: plan.filter(r => r.warnings.length > 0).length,
    notInFile,
  };
}

// ===== Revertir una importación =====

export interface RevertDecision {
  /** 'delete' = borrar el perfil que creó la importación; objeto = campos a restaurar (null = vaciar); null = nada. */
  profile: 'delete' | Record<string, string | null> | null;
  /** 'delete' = quitar la meta; objeto = volver a esa meta; null = nada. */
  goal: 'delete' | GoalSnapshot | null;
  /** Hay cambios hechos después de la importación que se conservan. */
  kept: boolean;
}

const sameValue = (a?: string | null, b?: string | null) => (a || null) === (b || null);

export function goalSnapshotOf(data?: Record<string, any> | null): GoalSnapshot | null {
  return data ? { monthlyGoal: Number(data.monthlyGoal) || 0, category: data.category, product: data.product } : null;
}

export function sameGoal(a?: GoalSnapshot | null, b?: GoalSnapshot | null): boolean {
  if (!a || !b) return !a && !b;
  return a.monthlyGoal === b.monthlyGoal && sameValue(a.category, b.category) && sameValue(a.product, b.product);
}

/**
 * Decide qué restaurar de un vendedor al revertir una importación. Solo se
 * restaura lo que sigue con el valor que dejó la importación; lo que alguien
 * cambió después (a mano o con otra importación) se conserva. Las entradas de
 * importaciones anteriores, sin `profileAfter`/`goalAfter`, se restauran completas.
 */
export function planRevertEntry(
  entry: RevertEntry,
  current: { profile?: Record<string, any>; goal: GoalSnapshot | null; loggedIn: boolean }
): RevertDecision {
  let kept = false;

  let goal: RevertDecision['goal'] = null;
  if (entry.goalTouched) {
    if (!entry.goalAfter || sameGoal(current.goal, entry.goalAfter)) {
      goal = entry.goalBefore ?? 'delete';
    } else if (!sameGoal(current.goal, entry.goalBefore)) {
      kept = true;
    }
  }

  const restore: Record<string, string | null> = {};
  for (const [field, before] of Object.entries(entry.profileBefore)) {
    const now = current.profile?.[field] as string | undefined;
    if (!entry.profileAfter || sameValue(now, entry.profileAfter[field])) restore[field] = before;
    else if (!sameValue(now, before)) kept = true;
  }

  let profile: RevertDecision['profile'] = null;
  if (!entry.profileExisted && !current.loggedIn) {
    // Perfil creado por la importación: se borra solo si nadie lo tocó después.
    profile = kept ? null : 'delete';
  } else if (Object.keys(restore).length > 0) {
    profile = restore;
  }

  return { profile, goal, kept };
}
