'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  CopyPlus,
  Download,
  Loader2,
  Lock,
  LockOpen,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CATEGORIES,
  PRODUCTS,
  type PeriodLock,
  type ProductType,
  type UserCategory,
  type UserGoalDoc,
} from '@/lib/types';
import {
  addMonths,
  categoryCsvName,
  downloadCsv,
  formatPeriod,
  goalDocId,
  simplify,
} from '@/lib/admin-utils';
import {
  getPeriodLock,
  loadGoalsForPeriod,
  loadVendors,
  saveVendorChanges,
  setPeriodLock,
  type ProfileFields,
  type VendorChange,
  type VendorRow,
} from '@/lib/admin-service';
import { PeriodPicker } from './PeriodPicker';
import { BulkActionsBar, type AdjustBase } from './BulkActionsBar';
import { LegacyDataBanner } from './LegacyDataBanner';
import {
  VendorGoalsTable,
  type GoalRow,
  type PendingEdit,
  type SortState,
} from './VendorGoalsTable';

type StatusFilter = 'all' | 'with_goal' | 'no_goal' | 'no_category' | 'no_product' | 'never_logged' | 'pending';

const STATUS_CARDS: { key: StatusFilter; label: string; tone?: 'warn' }[] = [
  { key: 'all', label: 'Vendedores' },
  { key: 'with_goal', label: 'Con meta' },
  { key: 'no_goal', label: 'Sin meta', tone: 'warn' },
  { key: 'no_category', label: 'Sin categoría', tone: 'warn' },
  { key: 'no_product', label: 'Sin producto', tone: 'warn' },
  { key: 'never_logged', label: 'Nunca han entrado' },
];

const matchesStatus = (row: GoalRow, status: StatusFilter) => {
  switch (status) {
    case 'with_goal':
      return row.goal !== null;
    case 'no_goal':
      return row.goal === null;
    case 'no_category':
      return !row.category;
    case 'no_product':
      return !row.product;
    case 'never_logged':
      return !row.vendor.uid && !row.vendor.lastLoginAt;
    case 'pending':
      return !!row.pending;
    default:
      return true;
  }
};

const CATEGORY_ORDER = Object.fromEntries(CATEGORIES.map((c, i) => [c.value, i]));

function compareRows(a: GoalRow, b: GoalRow, sort: SortState): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const nullsLast = (x: number | string | null | undefined, y: number | string | null | undefined) => {
    if (x === null || x === undefined || x === '') return y === null || y === undefined || y === '' ? 0 : 1;
    if (y === null || y === undefined || y === '') return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  };
  switch (sort.key) {
    case 'category':
      return nullsLast(a.category ? CATEGORY_ORDER[a.category] : null, b.category ? CATEGORY_ORDER[b.category] : null);
    case 'goal':
      return nullsLast(a.goal, b.goal);
    case 'prevGoal':
      return nullsLast(a.prevGoal, b.prevGoal);
    case 'delta': {
      const d = (r: GoalRow) => (r.goal !== null && r.prevGoal ? (r.goal - r.prevGoal) / r.prevGoal : null);
      return nullsLast(d(a), d(b));
    }
    case 'lastLogin':
      return nullsLast(a.vendor.lastLoginAt, b.vendor.lastLoginAt);
    default:
      return (a.vendor.name || a.email).localeCompare(b.vendor.name || b.email, 'es') * dir;
  }
}

/** Campos del perfil que se copian al crear el documento por correo de un vendedor de formato anterior. */
function storedProfileFields(v: VendorRow): ProfileFields {
  const fields: ProfileFields = {};
  if (v.name) fields.name = v.name;
  if (v.category) fields.category = v.category;
  if (v.product) fields.product = v.product;
  if (v.region) fields.region = v.region;
  if (v.manager) fields.manager = v.manager;
  return fields;
}

interface GoalsManagerProps {
  period: string;
  onPeriodChange: (period: string) => void;
  actor: string;
  reloadKey: number;
  onDirtyChange: (dirty: boolean) => void;
  onRequestImport: () => void;
}

export function GoalsManager({
  period,
  onPeriodChange,
  actor,
  reloadKey,
  onDirtyChange,
  onRequestImport,
}: GoalsManagerProps) {
  const { toast } = useToast();

  // ----- Datos -----
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [legacyDocCount, setLegacyDocCount] = useState(0);
  const [goals, setGoals] = useState<Map<string, UserGoalDoc>>(new Map());
  const [prevGoals, setPrevGoals] = useState<Map<string, UserGoalDoc>>(new Map());
  const [lock, setLock] = useState<PeriodLock | null>(null);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vendorReload, setVendorReload] = useState(0);

  const periodRef = useRef(period);
  periodRef.current = period;
  const idToEmailRef = useRef<Map<string, string>>(new Map());
  const periodRequest = useRef(0);

  const loadPeriodData = useCallback(async (p: string) => {
    const token = ++periodRequest.current;
    setLoadingPeriod(true);
    try {
      const [current, previous, periodLock] = await Promise.all([
        loadGoalsForPeriod(p, idToEmailRef.current),
        loadGoalsForPeriod(addMonths(p, -1), idToEmailRef.current),
        getPeriodLock(p),
      ]);
      if (token !== periodRequest.current) return;
      setGoals(current);
      setPrevGoals(previous);
      setLock(periodLock);
      setLoadError(null);
    } catch (error) {
      console.error('Error cargando metas:', error);
      if (token === periodRequest.current) setLoadError('No se pudieron cargar las metas del periodo');
    } finally {
      if (token === periodRequest.current) setLoadingPeriod(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVendors(true);
      try {
        const result = await loadVendors();
        if (cancelled) return;
        idToEmailRef.current = result.idToEmail;
        setVendors(result.vendors);
        setLegacyDocCount(result.legacyDocCount);
        await loadPeriodData(periodRef.current);
      } catch (error) {
        console.error('Error cargando vendedores:', error);
        if (!cancelled) setLoadError('No se pudieron cargar los vendedores');
      } finally {
        if (!cancelled) setLoadingVendors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, vendorReload, loadPeriodData]);

  const isFirstPeriodRun = useRef(true);
  useEffect(() => {
    if (isFirstPeriodRun.current) {
      isFirstPeriodRun.current = false;
      return;
    }
    loadPeriodData(period);
  }, [period, loadPeriodData]);

  // ----- Edición -----
  const [pending, setPending] = useState<Record<string, PendingEdit>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [confirmPeriod, setConfirmPeriod] = useState<string | null>(null);
  const [lockDialog, setLockDialog] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const pendingCount = Object.keys(pending).length;
  useEffect(() => onDirtyChange(pendingCount > 0), [pendingCount, onDirtyChange]);

  const locked = !!lock?.locked;
  const readOnly = locked || !!saving || loadingPeriod;

  // ----- Filtros -----
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [productFilter, setProductFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });

  // Los administradores no tienen metas: se excluyen de la lista.
  const vendorList = useMemo(() => vendors.filter(v => v.role !== 'admin'), [vendors]);
  const vendorMap = useMemo(() => new Map(vendorList.map(v => [v.email, v])), [vendorList]);
  const searchIndex = useMemo(
    () => new Map(vendorList.map(v => [v.email, simplify(`${v.name || ''} ${v.email} ${v.region || ''} ${v.manager || ''}`)])),
    [vendorList]
  );
  const regions = useMemo(
    () => [...new Set(vendorList.map(v => v.region).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')),
    [vendorList]
  );
  const managers = useMemo(
    () => [...new Set(vendorList.map(v => v.manager).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')),
    [vendorList]
  );

  const allRows = useMemo<GoalRow[]>(
    () =>
      vendorList.map(v => {
        const edit = pending[v.email];
        const savedGoal = goals.get(v.email)?.monthlyGoal ?? null;
        const goal = edit?.goal !== undefined ? edit.goal : savedGoal;
        const category = edit?.category ?? v.category;
        const product = edit?.product ?? v.product;
        return {
          email: v.email,
          vendor: v,
          savedGoal,
          goal,
          prevGoal: prevGoals.get(v.email)?.monthlyGoal ?? null,
          category,
          product,
          pending: edit,
          invalid:
            edit && goal !== null && !category
              ? 'Falta la categoría: sin ella no se puede guardar la meta'
              : undefined,
        };
      }),
    [vendorList, pending, goals, prevGoals]
  );
  const rowMap = useMemo(() => new Map(allRows.map(r => [r.email, r])), [allRows]);

  const scopeRows = useMemo(() => {
    const q = simplify(deferredSearch);
    return allRows.filter(r => {
      if (q && !searchIndex.get(r.email)?.includes(q)) return false;
      if (productFilter !== 'all' && (productFilter === 'none' ? !!r.product : r.product !== productFilter)) return false;
      if (categoryFilter !== 'all' && (categoryFilter === 'none' ? !!r.category : r.category !== categoryFilter)) return false;
      if (regionFilter !== 'all' && r.vendor.region !== regionFilter) return false;
      if (managerFilter !== 'all' && r.vendor.manager !== managerFilter) return false;
      return true;
    });
  }, [allRows, deferredSearch, searchIndex, productFilter, categoryFilter, regionFilter, managerFilter]);

  const statusCounts = useMemo(() => {
    const counts = {} as Record<StatusFilter, number>;
    for (const card of [...STATUS_CARDS, { key: 'pending' as StatusFilter }]) {
      counts[card.key] = scopeRows.filter(r => matchesStatus(r, card.key)).length;
    }
    return counts;
  }, [scopeRows]);

  const rows = useMemo(
    () => scopeRows.filter(r => matchesStatus(r, statusFilter)).sort((a, b) => compareRows(a, b, sort)),
    [scopeRows, statusFilter, sort]
  );

  const filtersActive =
    !!search || productFilter !== 'all' || categoryFilter !== 'all' || regionFilter !== 'all' || managerFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setProductFilter('all');
    setCategoryFilter('all');
    setRegionFilter('all');
    setManagerFilter('all');
    setStatusFilter('all');
  };

  // ----- Aplicar cambios pendientes -----
  const applyEdits = useCallback(
    (edits: Map<string, PendingEdit>) => {
      setPending(prev => {
        const next = { ...prev };
        edits.forEach((edit, email) => {
          const vendor = vendorMap.get(email);
          if (!vendor) return;
          const merged: PendingEdit = { ...next[email], ...edit };
          if (merged.goal !== undefined && merged.goal === (goals.get(email)?.monthlyGoal ?? null)) delete merged.goal;
          if (merged.category !== undefined && merged.category === vendor.category) delete merged.category;
          if (merged.product !== undefined && merged.product === vendor.product) delete merged.product;
          if (Object.keys(merged).length > 0) next[email] = merged;
          else delete next[email];
        });
        return next;
      });
    },
    [vendorMap, goals]
  );

  const handleEdit = useCallback(
    (email: string, edit: PendingEdit) => applyEdits(new Map([[email, edit]])),
    [applyEdits]
  );

  const editSelected = (build: (row: GoalRow) => PendingEdit | null): number => {
    const edits = new Map<string, PendingEdit>();
    let skipped = 0;
    selected.forEach(email => {
      const row = rowMap.get(email);
      if (!row) return;
      const edit = build(row);
      if (edit) edits.set(email, edit);
      else skipped++;
    });
    applyEdits(edits);
    return skipped;
  };

  const handleAdjust = (percent: number, base: AdjustBase) => {
    const skipped = editSelected(row => {
      const baseValue = base === 'previous' ? row.prevGoal : row.goal;
      if (!baseValue) return null;
      return { goal: Math.max(100, Math.round((baseValue * (1 + percent / 100)) / 100) * 100) };
    });
    if (skipped > 0) {
      toast({
        title: `${skipped} vendedor${skipped !== 1 ? 'es' : ''} sin meta base`,
        description: `No tienen meta ${base === 'previous' ? `en ${formatPeriod(addMonths(period, -1))}` : 'actual'}; no se modificaron.`,
      });
    }
  };

  const fillable = rows.filter(r => r.goal === null && r.prevGoal !== null);
  const handleFillMissing = () => {
    applyEdits(new Map(fillable.map(r => [r.email, { goal: r.prevGoal }])));
    toast({
      title: 'Metas copiadas',
      description: `${fillable.length} vendedores sin meta tomaron su meta de ${formatPeriod(addMonths(period, -1))}. Revisa y guarda.`,
    });
  };

  // ----- Selección -----
  const toggleRow = useCallback((email: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const allSelected = rows.length > 0 && rows.every(r => prev.has(r.email));
      const next = new Set(prev);
      rows.forEach(r => (allSelected ? next.delete(r.email) : next.add(r.email)));
      return next;
    });
  }, [rows]);

  const hiddenSelected = useMemo(() => {
    const visible = new Set(rows.map(r => r.email));
    let n = 0;
    selected.forEach(e => !visible.has(e) && n++);
    return n;
  }, [rows, selected]);

  // ----- Periodo -----
  const requestPeriodChange = (next: string) => {
    if (next === period) return;
    if (pendingCount > 0) {
      setConfirmPeriod(next);
      return;
    }
    setSelected(new Set());
    onPeriodChange(next);
  };

  const handleToggleLock = async () => {
    setLockBusy(true);
    try {
      await setPeriodLock(period, !locked, actor);
      setLock(await getPeriodLock(period));
      toast({
        title: locked ? 'Periodo reabierto' : 'Periodo cerrado',
        description: locked
          ? `Las metas de ${formatPeriod(period)} se pueden editar de nuevo.`
          : `Las metas de ${formatPeriod(period)} quedaron en solo lectura.`,
      });
    } catch (error) {
      console.error('Error cambiando el cierre del periodo:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el periodo', variant: 'destructive' });
    } finally {
      setLockBusy(false);
      setLockDialog(false);
    }
  };

  // ----- Guardar -----
  const handleSave = async () => {
    const changes: VendorChange[] = [];
    let invalid = 0;
    for (const [email, edit] of Object.entries(pending)) {
      const row = rowMap.get(email);
      if (!row) continue;
      if (row.invalid) {
        invalid++;
        continue;
      }
      const vendor = row.vendor;
      const saved = goals.get(email);
      const profile: ProfileFields = vendor.hasCanonical ? {} : storedProfileFields(vendor);
      if (edit.category !== undefined) profile.category = edit.category;
      if (edit.product !== undefined) profile.product = edit.product;

      let goal: VendorChange['goal'];
      if (edit.goal === null) {
        goal = saved ? null : undefined;
      } else if (typeof edit.goal === 'number') {
        goal = { monthlyGoal: edit.goal, category: row.category!, product: row.product };
      } else if (saved && row.category && (edit.category !== undefined || edit.product !== undefined)) {
        // La meta guarda categoría y producto del periodo; se mantienen sincronizados.
        goal = { monthlyGoal: saved.monthlyGoal, category: row.category, product: row.product };
      }

      changes.push({
        email,
        profile,
        createProfile: vendor.hasCanonical
          ? undefined
          : { role: vendor.role, name: vendor.name || email.split('@')[0] },
        goal,
      });
    }

    if (changes.length === 0) {
      toast({
        title: 'Nada que guardar',
        description: invalid > 0 ? `${invalid} cambio(s) necesitan categoría antes de guardarse.` : undefined,
        variant: invalid > 0 ? 'destructive' : undefined,
      });
      return;
    }

    setSaving({ done: 0, total: changes.length });
    try {
      const { ok, failed } = await saveVendorChanges(changes, period, actor, (done, total) =>
        setSaving({ done, total })
      );
      const okSet = new Set(ok);
      const now = new Date().toISOString();

      setVendors(prev =>
        prev.map(v => {
          if (!okSet.has(v.email)) return v;
          const edit = pending[v.email];
          return {
            ...v,
            hasCanonical: true,
            category: edit?.category ?? v.category,
            product: edit?.product ?? v.product,
          };
        })
      );
      setGoals(prev => {
        const next = new Map(prev);
        for (const change of changes) {
          if (!okSet.has(change.email)) continue;
          if (change.goal === null) next.delete(change.email);
          else if (change.goal) {
            next.set(change.email, {
              id: goalDocId(change.email, period),
              userEmail: change.email,
              period,
              ...change.goal,
              updatedAt: now,
              updatedBy: actor,
            });
          }
        }
        return next;
      });
      setPending(prev => {
        const next = { ...prev };
        okSet.forEach(email => delete next[email]);
        return next;
      });

      if (failed.length > 0) {
        toast({
          title: `${ok.length} guardados, ${failed.length} con error`,
          description: `${failed[0].error}. Los cambios con error siguen pendientes.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cambios guardados',
          description:
            `${ok.length} vendedor${ok.length !== 1 ? 'es' : ''} actualizado${ok.length !== 1 ? 's' : ''} en ${formatPeriod(period)}.` +
            (invalid > 0 ? ` ${invalid} siguen pendientes porque les falta categoría.` : ''),
        });
      }
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  // ----- Exportar -----
  const handleExport = () => {
    const prevLabel = formatPeriod(addMonths(period, -1));
    downloadCsv(
      `metas_${period}.csv`,
      ['Correo', 'Nombre', 'Categoría', 'Producto', 'Meta Mensual', 'Región', 'Gerente', `Meta ${prevLabel}`, 'Último acceso'],
      rows.map(r => [
        r.email,
        r.vendor.name || '',
        categoryCsvName(r.category),
        r.product || '',
        r.goal ?? '',
        r.vendor.region || '',
        r.vendor.manager || '',
        r.prevGoal ?? '',
        r.vendor.lastLoginAt ? r.vendor.lastLoginAt.slice(0, 10) : '',
      ])
    );
  };

  // ----- Render -----
  const prevPeriod = addMonths(period, -1);
  const loading = loadingVendors && vendors.length === 0;
  const invalidCount = allRows.filter(r => r.invalid).length;

  return (
    <div className="space-y-4">
      <LegacyDataBanner legacyDocCount={legacyDocCount} onDone={() => setVendorReload(n => n + 1)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker value={period} onChange={requestPeriodChange} disabled={!!saving} />
          {loadingPeriod && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {locked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Cerrado
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRequestImport}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Exportar ({rows.length.toLocaleString('es-MX')})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLockDialog(true)}
            disabled={pendingCount > 0 || loadingPeriod}
            title={pendingCount > 0 ? 'Guarda o descarta los cambios pendientes primero' : undefined}
          >
            {locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {locked ? 'Reabrir periodo' : 'Cerrar periodo'}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="rounded-md border bg-muted/60 p-3 text-sm text-muted-foreground">
          {formatPeriod(period)} está cerrado
          {lock?.lockedAt && ` desde el ${new Date(lock.lockedAt).toLocaleDateString('es-MX')}`}
          {lock?.lockedBy && ` (${lock.lockedBy})`}. Las metas son de solo lectura; reábrelo para corregirlas.
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}.{' '}
          <button className="underline" onClick={() => setVendorReload(n => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {/* Resumen: cada tarjeta filtra la tabla */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STATUS_CARDS.map(card => {
          const active = statusFilter === card.key;
          const count = statusCounts[card.key] ?? 0;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(active && card.key !== 'all' ? 'all' : card.key)}
              className={cn(
                'rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50',
                active && 'border-primary ring-1 ring-primary'
              )}
            >
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p
                className={cn(
                  'text-2xl font-semibold tabular-nums',
                  card.tone === 'warn' && count > 0 && 'text-amber-600'
                )}
              >
                {loading ? '—' : count.toLocaleString('es-MX')}
              </p>
            </button>
          );
        })}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, correo, región…"
            className="pl-8"
          />
        </div>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los productos</SelectItem>
            {PRODUCTS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="none">Sin producto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
            <SelectItem value="none">Sin categoría</SelectItem>
          </SelectContent>
        </Select>
        {regions.length > 0 && (
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {regions.map(r => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {managers.length > 0 && (
          <Select value={managerFilter} onValueChange={setManagerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los gerentes</SelectItem>
              {managers.map(m => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" /> Limpiar filtros
          </Button>
        )}
        {!locked && fillable.length > 0 && (
          <Button variant="secondary" size="sm" className="ml-auto gap-1.5" onClick={handleFillMissing} disabled={readOnly}>
            <CopyPlus className="h-4 w-4" />
            Completar {fillable.length.toLocaleString('es-MX')} sin meta con su meta de {formatPeriod(prevPeriod, true)}
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="space-y-1">
          <BulkActionsBar
            count={selected.size}
            prevLabel={formatPeriod(prevPeriod, true)}
            disabled={readOnly}
            onSetGoal={value => editSelected(() => ({ goal: value }))}
            onAdjust={handleAdjust}
            onSetCategory={(category: UserCategory) => editSelected(() => ({ category }))}
            onSetProduct={(product: ProductType) => editSelected(() => ({ product }))}
            onClearGoal={() => editSelected(() => ({ goal: null }))}
            onClearSelection={() => setSelected(new Set())}
          />
          {hiddenSelected > 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              {hiddenSelected.toLocaleString('es-MX')} de los seleccionados no se ven con los filtros actuales; las acciones
              también se les aplican.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-[420px] items-center justify-center rounded-md border">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-sm text-muted-foreground">Cargando vendedores…</span>
        </div>
      ) : (
        <VendorGoalsTable
          rows={rows}
          selected={selected}
          readOnly={readOnly}
          prevLabel={formatPeriod(prevPeriod, true)}
          periodLabel={formatPeriod(period, true)}
          sort={sort}
          onSortChange={setSort}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onEdit={handleEdit}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Mostrando {rows.length.toLocaleString('es-MX')} de {vendorList.length.toLocaleString('es-MX')} vendedores.
        Los administradores no aparecen en esta lista. Tip: en la columna de meta, Enter guarda y baja a la siguiente fila.
      </p>

      {/* Barra de cambios pendientes */}
      {(pendingCount > 0 || saving) && (
        <div className="sticky bottom-20 z-20 md:bottom-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
            {saving ? (
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  Guardando {saving.done.toLocaleString('es-MX')} / {saving.total.toLocaleString('es-MX')}…
                </p>
                <Progress value={saving.total ? (saving.done / saving.total) * 100 : 0} className="h-2" />
              </div>
            ) : (
              <>
                <div className="flex-1 text-sm">
                  <span className="font-medium">
                    {pendingCount.toLocaleString('es-MX')} cambio{pendingCount !== 1 ? 's' : ''} sin guardar
                  </span>
                  {invalidCount > 0 && (
                    <span className="ml-2 text-destructive">· {invalidCount} sin categoría (no se guardarán)</span>
                  )}
                  <button
                    type="button"
                    className="ml-2 text-primary underline-offset-2 hover:underline"
                    onClick={() => setStatusFilter('pending')}
                  >
                    Ver
                  </button>
                </div>
                <Button variant="ghost" onClick={() => setPending({})}>
                  Descartar
                </Button>
                <Button onClick={handleSave} disabled={locked}>
                  Guardar cambios
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={confirmPeriod !== null} onOpenChange={open => !open && setConfirmPeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes {pendingCount} cambio(s) sin guardar en {formatPeriod(period)}. Si cambias de periodo se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = confirmPeriod!;
                setPending({});
                setSelected(new Set());
                setConfirmPeriod(null);
                onPeriodChange(next);
              }}
            >
              Descartar y cambiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={lockDialog} onOpenChange={setLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locked ? `¿Reabrir ${formatPeriod(period)}?` : `¿Cerrar ${formatPeriod(period)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locked
                ? 'Las metas del periodo se podrán editar e importar de nuevo.'
                : 'Las metas del periodo quedarán en solo lectura: no se podrán editar, importar ni revertir hasta que alguien lo reabra. Úsalo cuando el mes ya se pagó.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lockBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleLock} disabled={lockBusy}>
              {locked ? 'Reabrir' : 'Cerrar periodo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
