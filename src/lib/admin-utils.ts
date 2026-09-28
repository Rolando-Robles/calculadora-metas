import type { ProductType, UserCategory } from './types';
import { CATEGORIES, CATEGORY_LABELS, PRODUCTS } from './types';

// ===== Identidad del vendedor =====

/**
 * El correo en minúsculas es el identificador único del vendedor: es el ID
 * del documento en `users/` y la llave de sus metas. Así lo que carga el
 * admin (CSV o tabla) y lo que ve el vendedor al iniciar sesión es siempre
 * el mismo documento.
 */
export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

/** ID del documento de meta; conserva el formato histórico para no romper datos existentes. */
export function goalDocId(email: string, period: string): string {
  return `${normalizeEmail(email).replace('@', '_at_').replace(/\./g, '_')}-${period}`;
}

export const VENDOR_EMAIL_DOMAIN = '@avivacredito.com';

export function isVendorEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@avivacredito\.com$/.test(normalized);
}

// ===== Periodos (YYYY-MM) =====

export function currentPeriod(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addMonths(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentPeriod(d);
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatPeriod(period: string, short = false): string {
  if (!isValidPeriod(period)) return period;
  const [y, m] = period.split('-').map(Number);
  const name = MONTHS[m - 1];
  const label = short ? name.slice(0, 3) : name;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`;
}

// ===== Normalización de valores capturados por humanos =====

/** minúsculas, sin acentos, sin espacios sobrantes */
export function simplify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

const CATEGORY_ALIASES: Record<string, UserCategory> = {};
for (const cat of CATEGORIES) {
  CATEGORY_ALIASES[simplify(cat.value)] = cat.value; // g1..g4
  CATEGORY_ALIASES[simplify(cat.label)] = cat.value; // formacion, territorio, consolidado, elite
}

/** Acepta "Élite", "elite", "G4", "g4"… Devuelve null si no se reconoce. */
export function parseCategory(value: string): UserCategory | null {
  if (!value) return null;
  return CATEGORY_ALIASES[simplify(value)] ?? null;
}

/** Nombre de categoría en el formato de la plantilla CSV (minúsculas, sin acento). */
export function categoryCsvName(category?: string): string {
  if (!category) return '';
  const label = CATEGORY_LABELS[category as UserCategory];
  return label ? simplify(label) : category;
}

export function categoryLabel(category?: string): string {
  if (!category) return '';
  return CATEGORY_LABELS[category as UserCategory] || category;
}

const PRODUCT_ALIASES: Record<string, ProductType> = {};
for (const p of PRODUCTS) {
  PRODUCT_ALIASES[simplify(p.value)] = p.value;
  PRODUCT_ALIASES[simplify(p.label).replace(/\s+/g, '_')] = p.value;
}

/** Acepta "aviva_contigo", "Aviva Contigo", "AVIVA CONTIGO"… */
export function parseProduct(value: string): ProductType | null {
  if (!value) return null;
  const key = simplify(value).replace(/[\s-]+/g, '_');
  return PRODUCT_ALIASES[key] ?? null;
}

export function productLabel(product?: string): string {
  if (!product) return '';
  return PRODUCTS.find(p => p.value === product)?.label || product;
}

/**
 * Convierte montos capturados a mano o exportados de Excel: "$200,000",
 * "200 000", "200000.50", "1,5". Devuelve null si no es un número.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let value = raw.replace(/[$\s]/g, '').replace(/mxn/i, '');
  if (!value) return null;
  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  if (hasComma && hasDot) {
    // 200,000.50 → formato es-MX: la coma separa miles
    value = value.replace(/,/g, '');
  } else if (hasComma) {
    // 200,000 / 1,200,000 son miles; 1500,5 es decimal
    value = /^\d{1,3}(,\d{3})+$/.test(value) ? value.replace(/,/g, '') : value.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ===== CSV =====

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
}

/** Descarga un CSV con BOM para que Excel respete acentos. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
