'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CATEGORIES, PRODUCTS, type ProductType, type UserCategory } from '@/lib/types';
import { formatCurrency, parseAmount } from '@/lib/admin-utils';
import type { VendorRow } from '@/lib/admin-service';

export interface PendingEdit {
  goal?: number | null;
  category?: UserCategory;
  product?: ProductType;
}

export interface GoalRow {
  email: string;
  vendor: VendorRow;
  savedGoal: number | null;
  goal: number | null;
  prevGoal: number | null;
  category?: UserCategory;
  product?: ProductType;
  pending?: PendingEdit;
  /** Motivo por el que el cambio pendiente no se puede guardar. */
  invalid?: string;
}

export type SortKey = 'name' | 'category' | 'prevGoal' | 'goal' | 'delta' | 'lastLogin';
export type SortState = { key: SortKey; dir: 'asc' | 'desc' };

const GRID =
  'grid grid-cols-[40px_minmax(220px,2fr)_170px_140px_minmax(120px,1fr)_120px_150px_72px_110px] items-center gap-x-3 px-3';

const ROW_HEIGHT = 56;

interface VendorGoalsTableProps {
  rows: GoalRow[];
  selected: Set<string>;
  readOnly: boolean;
  prevLabel: string;
  periodLabel: string;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onToggleRow: (email: string) => void;
  onToggleAll: () => void;
  onEdit: (email: string, edit: PendingEdit) => void;
}

export function VendorGoalsTable({
  rows,
  selected,
  readOnly,
  prevLabel,
  periodLabel,
  sort,
  onSortChange,
  onToggleRow,
  onToggleAll,
  onEdit,
}: VendorGoalsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  // Enter en una meta pasa a la meta de la siguiente fila, como en una hoja de cálculo.
  const focusGoalInput = useCallback(
    (index: number) => {
      if (index < 0 || index >= rows.length) return;
      virtualizer.scrollToIndex(index, { align: 'auto' });
      requestAnimationFrame(() => {
        parentRef.current
          ?.querySelector<HTMLInputElement>(`[data-goal-input="${index}"]`)
          ?.focus();
      });
    },
    [rows.length, virtualizer]
  );

  const selectedInView = rows.filter(r => selected.has(r.email)).length;
  const allState: boolean | 'indeterminate' =
    rows.length > 0 && selectedInView === rows.length ? true : selectedInView > 0 ? 'indeterminate' : false;

  const header = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className={cn(
          'flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'justify-end',
          active && 'text-foreground'
        )}
        onClick={() => onSortChange({ key, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={parentRef} className="relative h-[62vh] min-h-[420px] overflow-auto rounded-md border bg-card">
        <div className="min-w-[1140px]">
          <div
            className={cn(
              GRID,
              'sticky top-0 z-10 h-10 border-b bg-muted/95 text-xs font-medium text-muted-foreground backdrop-blur'
            )}
            role="row"
          >
            <Checkbox
              checked={allState}
              onCheckedChange={onToggleAll}
              aria-label="Seleccionar todos los resultados"
              disabled={rows.length === 0}
            />
            {header('name', 'Vendedor')}
            <span>Producto</span>
            {header('category', 'Categoría')}
            <span>Región / Gerente</span>
            <div className="justify-self-end">{header('prevGoal', `Meta ${prevLabel}`, 'right')}</div>
            <div className="justify-self-end">{header('goal', `Meta ${periodLabel}`, 'right')}</div>
            <div className="justify-self-end">{header('delta', 'Δ', 'right')}</div>
            {header('lastLogin', 'Último acceso')}
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Ningún vendedor coincide con los filtros.
            </div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(item => {
                const row = rows[item.index];
                return (
                  <VendorRowView
                    key={row.email}
                    index={item.index}
                    row={row}
                    top={item.start}
                    selected={selected.has(row.email)}
                    readOnly={readOnly}
                    onToggle={onToggleRow}
                    onEdit={onEdit}
                    onEnter={focusGoalInput}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface VendorRowViewProps {
  index: number;
  row: GoalRow;
  top: number;
  selected: boolean;
  readOnly: boolean;
  onToggle: (email: string) => void;
  onEdit: (email: string, edit: PendingEdit) => void;
  onEnter: (index: number) => void;
}

const selectClass =
  'h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60';

const VendorRowView = memo(function VendorRowView({
  index,
  row,
  top,
  selected,
  readOnly,
  onToggle,
  onEdit,
  onEnter,
}: VendorRowViewProps) {
  const { vendor, pending } = row;
  const delta =
    row.goal !== null && row.prevGoal ? (row.goal - row.prevGoal) / row.prevGoal : null;

  return (
    <div
      role="row"
      className={cn(
        GRID,
        'absolute left-0 w-full border-b text-sm transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-muted/40'
      )}
      style={{ top: 0, height: ROW_HEIGHT, transform: `translateY(${top}px)` }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(row.email)}
        aria-label={`Seleccionar ${vendor.name || row.email}`}
      />
      <div className="min-w-0">
        <p className="truncate font-medium">{vendor.name || row.email.split('@')[0]}</p>
        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
      </div>
      <select
        className={cn(selectClass, pending?.product !== undefined && 'border-amber-400 bg-amber-50 dark:bg-amber-950/30')}
        value={row.product || ''}
        disabled={readOnly}
        onChange={e => onEdit(row.email, { product: e.target.value as ProductType })}
        aria-label="Producto"
      >
        <option value="" disabled>
          Sin producto
        </option>
        {PRODUCTS.map(p => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        className={cn(
          selectClass,
          pending?.category !== undefined && 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
          !row.category && 'border-destructive/60 text-muted-foreground'
        )}
        value={row.category || ''}
        disabled={readOnly}
        onChange={e => onEdit(row.email, { category: e.target.value as UserCategory })}
        aria-label="Categoría"
      >
        <option value="" disabled>
          Sin categoría
        </option>
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="min-w-0 text-xs">
        <p className="truncate">{vendor.region || <span className="text-muted-foreground">—</span>}</p>
        {vendor.manager && <p className="truncate text-muted-foreground">{vendor.manager}</p>}
      </div>
      <p className="text-right tabular-nums text-muted-foreground">
        {row.prevGoal !== null ? formatCurrency(row.prevGoal) : '—'}
      </p>
      <div className="flex items-center justify-end gap-1">
        {row.invalid && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-label={row.invalid} />
            </TooltipTrigger>
            <TooltipContent>{row.invalid}</TooltipContent>
          </Tooltip>
        )}
        <GoalInput
          index={index}
          value={row.goal}
          dirty={pending?.goal !== undefined}
          invalid={!!row.invalid}
          disabled={readOnly}
          onCommit={value => onEdit(row.email, { goal: value })}
          onEnter={() => onEnter(index + 1)}
        />
      </div>
      <p
        className={cn(
          'text-right text-xs tabular-nums',
          delta === null ? 'text-muted-foreground' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : ''
        )}
      >
        {delta === null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`}
      </p>
      <LastLogin value={vendor.lastLoginAt} hasUid={!!vendor.uid} />
    </div>
  );
});

function LastLogin({ value, hasUid }: { value?: string; hasUid: boolean }) {
  if (!value) {
    return (
      <span className={cn('text-xs', hasUid ? 'text-muted-foreground' : 'text-amber-600')}>
        {hasUid ? 'Sin registro' : 'Nunca'}
      </span>
    );
  }
  const date = new Date(value);
  return (
    <span className="text-xs text-muted-foreground" title={date.toLocaleString('es-MX')}>
      hace {formatDistanceToNowStrict(date, { locale: es })}
    </span>
  );
}

interface GoalInputProps {
  index: number;
  value: number | null;
  dirty: boolean;
  invalid: boolean;
  disabled: boolean;
  onCommit: (value: number | null) => void;
  onEnter: () => void;
}

/** Captura de meta: muestra $ con separadores; al editar acepta "220000", "220,000" o "$220,000". */
function GoalInput({ index, value, dirty, invalid, disabled, onCommit, onEnter }: GoalInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) return;
    const trimmed = draft.trim();
    const parsed = trimmed === '' ? null : parseAmount(trimmed);
    if (trimmed !== '' && (parsed === null || parsed <= 0)) {
      setDraft(null); // valor inválido: se descarta
      return;
    }
    const next = parsed === null ? null : Math.round(parsed);
    if (next !== value) onCommit(next);
    setDraft(null);
  };

  return (
    <input
      data-goal-input={index}
      inputMode="numeric"
      className={cn(
        'h-9 w-[130px] rounded-md border bg-background px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        dirty && 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
        invalid && 'border-destructive'
      )}
      placeholder="Sin meta"
      disabled={disabled}
      value={draft ?? (value !== null ? formatCurrency(value) : '')}
      onFocus={e => {
        setDraft(value !== null ? String(value) : '');
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          onEnter();
        } else if (e.key === 'Escape') {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      aria-label="Meta mensual"
    />
  );
}
