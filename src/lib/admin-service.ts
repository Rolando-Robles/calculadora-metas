import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PeriodLock, ProductType, UserCategory, UserGoalDoc, VendorProfile } from './types';
import { chunk, goalDocId, normalizeEmail } from './admin-utils';
import { groupUserDocs, toStoredProfile, type MergedProfile, type RawUserDoc } from './profile-merge';

function fdb(): Firestore {
  if (!db) throw new Error('Firestore no está inicializado');
  return db;
}

const nowIso = () => new Date().toISOString();

/** Firestore rechaza `undefined`; se eliminan antes de escribir. */
function clean<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Firestore permite 500 operaciones por lote; se deja margen.
const BATCH_LIMIT = 450;

type BatchOp =
  | { kind: 'set'; ref: DocumentReference; data: Record<string, unknown>; merge?: boolean }
  | { kind: 'update'; ref: DocumentReference; data: Record<string, unknown> }
  | { kind: 'delete'; ref: DocumentReference };

/**
 * Escribe operaciones en lotes. Las operaciones de un mismo grupo (p. ej. el
 * perfil y la meta de un vendedor) nunca se separan entre lotes, así un
 * vendedor queda completo o sin cambios.
 */
async function commitGroups(
  groups: { key: string; ops: BatchOp[] }[],
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: string[]; failed: { key: string; error: string }[] }> {
  const ok: string[] = [];
  const failed: { key: string; error: string }[] = [];
  const total = groups.length;

  let current: typeof groups = [];
  let opCount = 0;
  const flush = async () => {
    if (current.length === 0) return;
    const batch = writeBatch(fdb());
    for (const group of current) {
      for (const op of group.ops) {
        if (op.kind === 'set') batch.set(op.ref, op.data, { merge: !!op.merge });
        else if (op.kind === 'update') batch.update(op.ref, op.data as { [field: string]: any });
        else batch.delete(op.ref);
      }
    }
    try {
      await batch.commit();
      ok.push(...current.map(g => g.key));
    } catch (error: any) {
      console.error('Error al guardar lote:', error);
      const message = error?.code === 'permission-denied'
        ? 'Sin permiso (¿periodo cerrado o sesión sin rol admin?)'
        : error?.message || 'Error desconocido';
      failed.push(...current.map(g => ({ key: g.key, error: message })));
    }
    onProgress?.(ok.length + failed.length, total);
    current = [];
    opCount = 0;
  };

  for (const group of groups) {
    if (group.ops.length === 0) {
      ok.push(group.key);
      continue;
    }
    if (opCount + group.ops.length > BATCH_LIMIT) await flush();
    current.push(group);
    opCount += group.ops.length;
  }
  await flush();
  return { ok, failed };
}

// ===== Lectura =====

export type VendorRow = MergedProfile;

export async function loadVendors(): Promise<{
  vendors: VendorRow[];
  legacyDocCount: number;
  orphanCount: number;
  idToEmail: Map<string, string>;
}> {
  const snapshot = await getDocs(collection(fdb(), 'users'));
  const docs: RawUserDoc[] = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
  const { profiles, orphans } = groupUserDocs(docs);

  const idToEmail = new Map<string, string>();
  for (const p of profiles) {
    idToEmail.set(p.email, p.email);
    p.legacyIds.forEach(id => idToEmail.set(id, p.email));
  }
  // Los documentos sin correo no se pueden consolidar; se reportan aparte.
  const legacyDocCount = profiles.reduce((n, p) => n + p.legacyIds.length, 0);

  return { vendors: profiles, legacyDocCount, orphanCount: orphans.length, idToEmail };
}

function goalFromDoc(id: string, data: Record<string, any>, idToEmail?: Map<string, string>): UserGoalDoc | null {
  const email = data.userEmail
    ? normalizeEmail(data.userEmail)
    : data.userId && idToEmail?.get(data.userId);
  if (!email) return null;
  return {
    id,
    userEmail: email,
    monthlyGoal: Number(data.monthlyGoal) || 0,
    category: data.category,
    product: data.product,
    period: data.period,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

/** Metas de un solo periodo, indexadas por correo. */
export async function loadGoalsForPeriod(
  period: string,
  idToEmail?: Map<string, string>
): Promise<Map<string, UserGoalDoc>> {
  const snapshot = await getDocs(
    query(collection(fdb(), 'userGoals'), where('period', '==', period))
  );
  const byEmail = new Map<string, UserGoalDoc>();
  for (const d of snapshot.docs) {
    const goal = goalFromDoc(d.id, d.data(), idToEmail);
    if (!goal) continue;
    const existing = byEmail.get(goal.userEmail);
    // Si hay duplicados de formato anterior, gana la más reciente.
    if (!existing || String(goal.updatedAt || '') > String(existing.updatedAt || '')) {
      byEmail.set(goal.userEmail, goal);
    }
  }
  return byEmail;
}

// ===== Cierre de periodo =====

export async function getPeriodLock(period: string): Promise<PeriodLock | null> {
  const snap = await getDoc(doc(fdb(), 'periods', period));
  return snap.exists() ? (snap.data() as PeriodLock) : null;
}

export async function setPeriodLock(period: string, locked: boolean, actor: string) {
  await setDoc(
    doc(fdb(), 'periods', period),
    locked
      ? { locked: true, lockedAt: nowIso(), lockedBy: actor }
      : { locked: false, reopenedAt: nowIso(), reopenedBy: actor },
    { merge: true }
  );
}

// ===== Escritura de cambios =====

export type ProfileFields = Partial<Pick<VendorProfile, 'name' | 'category' | 'product' | 'region' | 'manager'>>;

export interface VendorChange {
  email: string;
  /** Campos del perfil a escribir. */
  profile?: ProfileFields;
  /** Crear el documento `users/{correo}` (no existía en formato actual). */
  createProfile?: { role: VendorProfile['role']; name: string };
  /** undefined = sin cambio; null = quitar la meta; objeto = guardar. */
  goal?: { monthlyGoal: number; category: UserCategory; product?: ProductType } | null;
}

function opsForChange(change: VendorChange, period: string, actor: string): BatchOp[] {
  const ops: BatchOp[] = [];
  const email = normalizeEmail(change.email);
  const timestamp = nowIso();

  if (change.createProfile || (change.profile && Object.keys(change.profile).length > 0)) {
    ops.push({
      kind: 'set',
      ref: doc(fdb(), 'users', email),
      merge: true,
      data: clean({
        email,
        ...(change.createProfile
          ? { role: change.createProfile.role, name: change.createProfile.name, status: 'activo', createdAt: timestamp }
          : {}),
        ...change.profile,
        updatedAt: timestamp,
      }),
    });
  }

  if (change.goal === null) {
    ops.push({ kind: 'delete', ref: doc(fdb(), 'userGoals', goalDocId(email, period)) });
  } else if (change.goal) {
    ops.push({
      kind: 'set',
      ref: doc(fdb(), 'userGoals', goalDocId(email, period)),
      data: clean({
        userEmail: email,
        monthlyGoal: change.goal.monthlyGoal,
        category: change.goal.category,
        product: change.goal.product,
        period,
        updatedAt: timestamp,
        updatedBy: actor,
      }),
    });
  }
  return ops;
}

export async function saveVendorChanges(
  changes: VendorChange[],
  period: string,
  actor: string,
  onProgress?: (done: number, total: number) => void
) {
  const groups = changes.map(change => ({
    key: normalizeEmail(change.email),
    ops: opsForChange(change, period, actor),
  }));
  return commitGroups(groups, onProgress);
}

// ===== Consolidación de perfiles duplicados / formato anterior =====

export interface ConsolidationResult {
  profilesWritten: number;
  legacyProfilesDeleted: number;
  goalsFixed: number;
  unresolvedGoals: number;
  orphanProfiles: number;
  failed: number;
}

/**
 * Lleva todos los datos al formato actual:
 * 1. Un solo `users/{correo}` por vendedor con la fusión de sus documentos.
 * 2. Metas con `userEmail` en minúsculas y ID canónico.
 * 3. Borra los documentos de formato anterior (al final, cuando lo demás ya se escribió).
 */
export async function consolidateLegacyData(
  onProgress?: (step: string, done: number, total: number) => void
): Promise<ConsolidationResult> {
  const { vendors, idToEmail, orphanCount } = await loadVendors();
  const needsWork = vendors.filter(v => v.legacyIds.length > 0 || !v.hasCanonical);

  const result: ConsolidationResult = {
    profilesWritten: 0,
    legacyProfilesDeleted: 0,
    goalsFixed: 0,
    unresolvedGoals: 0,
    orphanProfiles: orphanCount,
    failed: 0,
  };

  // 1. Perfiles canónicos
  const profileGroups = needsWork.map(v => ({
    key: v.email,
    ops: [{ kind: 'set', ref: doc(fdb(), 'users', v.email), merge: true, data: toStoredProfile(v) } as BatchOp],
  }));
  const profiles = await commitGroups(profileGroups, (d, t) => onProgress?.('Perfiles', d, t));
  result.profilesWritten = profiles.ok.length;
  result.failed += profiles.failed.length;

  // 2. Metas: se agrupan por periodo para no exceder el límite de lecturas de las reglas por lote.
  const goalsSnap = await getDocs(collection(fdb(), 'userGoals'));
  const allGoals = goalsSnap.docs.map(d => ({ id: d.id, data: d.data() }));
  const existingIds = new Map(allGoals.map(g => [g.id, g.data]));
  const byPeriod = new Map<string, { key: string; ops: BatchOp[] }[]>();

  for (const g of allGoals) {
    const goal = goalFromDoc(g.id, g.data, idToEmail);
    if (!goal || !goal.period) {
      result.unresolvedGoals++;
      continue;
    }
    const targetId = goalDocId(goal.userEmail, goal.period);
    if (targetId === g.id && g.data.userEmail === goal.userEmail) continue;

    const ops: BatchOp[] = [];
    const target = existingIds.get(targetId);
    const legacyIsNewer =
      !target || String(g.data.updatedAt || '') > String(target.updatedAt || '');
    if (targetId === g.id) {
      ops.push({ kind: 'update', ref: doc(fdb(), 'userGoals', g.id), data: { userEmail: goal.userEmail } });
    } else {
      if (legacyIsNewer) {
        const { userId: _u, ...rest } = g.data;
        ops.push({
          kind: 'set',
          ref: doc(fdb(), 'userGoals', targetId),
          data: clean({ ...rest, userEmail: goal.userEmail, migratedAt: nowIso() }),
        });
        existingIds.set(targetId, { ...g.data, userEmail: goal.userEmail });
      }
      ops.push({ kind: 'delete', ref: doc(fdb(), 'userGoals', g.id) });
    }
    const list = byPeriod.get(goal.period) || [];
    list.push({ key: g.id, ops });
    byPeriod.set(goal.period, list);
  }
  for (const [period, groups] of byPeriod) {
    const res = await commitGroups(groups, (d, t) => onProgress?.(`Metas ${period}`, d, t));
    result.goalsFixed += res.ok.length;
    result.failed += res.failed.length;
  }

  // 3. Borrar perfiles de formato anterior solo de los vendedores cuyo perfil canónico se escribió.
  const written = new Set(profiles.ok);
  const deleteGroups = needsWork
    .filter(v => written.has(v.email))
    .flatMap(v => v.legacyIds.map(id => ({ key: id, ops: [{ kind: 'delete', ref: doc(fdb(), 'users', id) } as BatchOp] })));
  const deleted = await commitGroups(deleteGroups, (d, t) => onProgress?.('Limpieza', d, t));
  result.legacyProfilesDeleted = deleted.ok.length;
  result.failed += deleted.failed.length;

  return result;
}

// ===== Importaciones =====

export interface RevertEntry {
  email: string;
  /** Existía `users/{correo}` antes de la importación. */
  profileExisted: boolean;
  /** Valor previo de cada campo de perfil que la importación modificó (null = vacío). */
  profileBefore: Record<string, string | null>;
  goalTouched: boolean;
  goalBefore: { monthlyGoal: number; category?: string; product?: string } | null;
}

export interface ImportLog {
  id: string;
  fileName: string;
  period: string;
  createdAt: string;
  createdBy: string;
  status: 'running' | 'completed' | 'partial' | 'reverted' | 'failed';
  totalRows: number;
  counts: { new: number; update: number; unchanged: number; error: number };
  applied?: number;
  failed?: number;
  revertedAt?: string;
  revertedBy?: string;
}

export async function executeImport(params: {
  fileName: string;
  period: string;
  actor: string;
  totalRows: number;
  counts: ImportLog['counts'];
  changes: VendorChange[];
  revertEntries: RevertEntry[];
  onProgress?: (done: number, total: number) => void;
}): Promise<{ importId: string; applied: number; failed: { key: string; error: string }[] }> {
  const logRef = doc(collection(fdb(), 'imports'));
  await setDoc(logRef, {
    fileName: params.fileName,
    period: params.period,
    createdAt: nowIso(),
    createdBy: params.actor,
    status: 'running',
    totalRows: params.totalRows,
    counts: params.counts,
  });

  // Primero se guarda el "antes" para poder revertir aunque la carga se interrumpa.
  const revertChunks = chunk(params.revertEntries, 300);
  for (const group of chunk(revertChunks, 50)) {
    const batch = writeBatch(fdb());
    group.forEach(entries => {
      const index = revertChunks.indexOf(entries);
      batch.set(doc(logRef, 'chunks', String(index).padStart(4, '0')), { entries });
    });
    await batch.commit();
  }

  const { ok, failed } = await saveVendorChanges(
    params.changes,
    params.period,
    params.actor,
    params.onProgress
  );

  await updateDoc(logRef, {
    status: failed.length === 0 ? 'completed' : ok.length === 0 ? 'failed' : 'partial',
    applied: ok.length,
    failed: failed.length,
    finishedAt: nowIso(),
  });

  return { importId: logRef.id, applied: ok.length, failed };
}

export async function listImports(max = 20): Promise<ImportLog[]> {
  const snap = await getDocs(query(collection(fdb(), 'imports'), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ImportLog, 'id'>) }));
}

/**
 * Regresa perfiles y metas al estado previo a la importación. Los perfiles
 * que la importación creó se borran solo si la persona nunca ha iniciado sesión.
 */
export async function revertImport(
  log: ImportLog,
  actor: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: number; failed: number }> {
  const logRef = doc(fdb(), 'imports', log.id);
  const chunksSnap = await getDocs(collection(logRef, 'chunks'));
  const entries: RevertEntry[] = chunksSnap.docs.flatMap(d => d.data().entries || []);

  const usersSnap = await getDocs(collection(fdb(), 'users'));
  const loggedIn = new Set(
    usersSnap.docs.filter(d => d.data().uid || d.data().lastLoginAt).map(d => d.id)
  );

  const groups = entries.map(entry => {
    const ops: BatchOp[] = [];
    const userRef = doc(fdb(), 'users', entry.email);
    const fields = Object.keys(entry.profileBefore);
    if (!entry.profileExisted && !loggedIn.has(entry.email)) {
      ops.push({ kind: 'delete', ref: userRef });
    } else if (fields.length > 0) {
      const data: Record<string, unknown> = { updatedAt: nowIso() };
      for (const field of fields) {
        const before = entry.profileBefore[field];
        data[field] = before === null ? deleteField() : before;
      }
      ops.push({ kind: 'set', ref: userRef, merge: true, data });
    }
    if (entry.goalTouched) {
      const goalRef = doc(fdb(), 'userGoals', goalDocId(entry.email, log.period));
      if (entry.goalBefore) {
        ops.push({
          kind: 'set',
          ref: goalRef,
          data: clean({
            userEmail: entry.email,
            period: log.period,
            ...entry.goalBefore,
            updatedAt: nowIso(),
            updatedBy: actor,
          }),
        });
      } else {
        ops.push({ kind: 'delete', ref: goalRef });
      }
    }
    return { key: entry.email, ops };
  });

  const { ok, failed } = await commitGroups(groups, onProgress);
  if (failed.length === 0) {
    await updateDoc(logRef, { status: 'reverted', revertedAt: nowIso(), revertedBy: actor });
  }
  return { ok: ok.length, failed: failed.length };
}
