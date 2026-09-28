import type { VendorProfile } from './types';
import { normalizeEmail } from './admin-utils';

export interface RawUserDoc {
  id: string;
  data: Record<string, any>;
}

/** Perfil fusionado a partir de todos los documentos que pertenecen al mismo correo. */
export interface MergedProfile extends VendorProfile {
  /** Existe `users/{correo}` (formato actual). */
  hasCanonical: boolean;
  /** IDs de documentos en formato anterior (uid de Firebase o alias del CSV viejo). */
  legacyIds: string[];
}

/**
 * ID que usaba la importación CSV anterior: la parte local del correo con
 * símbolos reemplazados por "_". Se conserva solo para encontrar esos perfiles.
 */
export function legacySlugId(email: string): string {
  return normalizeEmail(email).replace('@avivacredito.com', '').replace(/[^a-zA-Z0-9]/g, '_');
}

/** Correo al que pertenece un documento de `users/`, venga en el formato que venga. */
export function emailOfUserDoc(doc: RawUserDoc): string {
  if (doc.data.email) return normalizeEmail(doc.data.email);
  return doc.id.includes('@') ? normalizeEmail(doc.id) : '';
}

const MERGED_FIELDS = ['category', 'product', 'region', 'manager', 'status'] as const;

const timestampOf = (doc: RawUserDoc) => String(doc.data.updatedAt || doc.data.createdAt || '');

/**
 * Antes de unificar el ID, un mismo vendedor podía tener hasta tres documentos:
 * el del CSV viejo (`juan_perez`), el de su login (`uid`) y el actual (`correo`).
 * Aquí se combinan: por campo gana el valor no vacío más reciente, el rol es
 * admin si cualquiera lo es, y el nombre de Google gana sobre el alias del correo.
 */
export function mergeProfiles(email: string, docs: RawUserDoc[]): MergedProfile {
  const normalized = normalizeEmail(email);
  const emailPrefix = normalized.split('@')[0];
  const ordered = [...docs].sort((a, b) => timestampOf(a).localeCompare(timestampOf(b)));

  const merged: MergedProfile = {
    email: normalized,
    role: 'vendedor',
    hasCanonical: docs.some(d => d.id === normalized),
    legacyIds: docs.filter(d => d.id !== normalized).map(d => d.id),
  };

  for (const { data } of ordered) {
    if (data.role === 'admin') merged.role = 'admin';
    for (const field of MERGED_FIELDS) {
      if (data[field]) (merged as any)[field] = data[field];
    }
    if (data.name && (!merged.name || data.name !== emailPrefix)) merged.name = data.name;
    if (data.uid) merged.uid = data.uid;
    if (data.lastLoginAt && (!merged.lastLoginAt || data.lastLoginAt > merged.lastLoginAt)) {
      merged.lastLoginAt = data.lastLoginAt;
    }
    if (data.createdAt && (!merged.createdAt || data.createdAt < merged.createdAt)) {
      merged.createdAt = data.createdAt;
    }
    if (data.updatedAt && (!merged.updatedAt || data.updatedAt > merged.updatedAt)) {
      merged.updatedAt = data.updatedAt;
    }
  }

  return merged;
}

/** Agrupa todos los documentos de `users/` por correo y los fusiona. */
export function groupUserDocs(docs: RawUserDoc[]): {
  profiles: MergedProfile[];
  /** Documentos sin correo: no se pueden asignar a nadie. */
  orphans: RawUserDoc[];
} {
  const byEmail = new Map<string, RawUserDoc[]>();
  const orphans: RawUserDoc[] = [];
  for (const doc of docs) {
    const email = emailOfUserDoc(doc);
    if (!email) {
      orphans.push(doc);
      continue;
    }
    const list = byEmail.get(email) || [];
    list.push(doc);
    byEmail.set(email, list);
  }
  const profiles = [...byEmail.entries()].map(([email, list]) => mergeProfiles(email, list));
  return { profiles, orphans };
}

/** Campos que se guardan en el documento canónico (sin los metadatos de la fusión). */
export function toStoredProfile(profile: MergedProfile): Record<string, unknown> {
  const { hasCanonical: _h, legacyIds: _l, ...stored } = profile;
  return Object.fromEntries(Object.entries(stored).filter(([, v]) => v !== undefined && v !== ''));
}
