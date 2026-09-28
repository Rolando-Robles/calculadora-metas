'use client';

import { useState } from 'react';
import { Percent, Tag, Package, Target, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORIES, PRODUCTS, type ProductType, type UserCategory } from '@/lib/types';
import { parseAmount } from '@/lib/admin-utils';

export type AdjustBase = 'current' | 'previous';

interface BulkActionsBarProps {
  count: number;
  prevLabel: string;
  disabled: boolean;
  onSetGoal: (value: number) => void;
  onAdjust: (percent: number, base: AdjustBase) => void;
  onSetCategory: (category: UserCategory) => void;
  onSetProduct: (product: ProductType) => void;
  onClearGoal: () => void;
  onClearSelection: () => void;
}

/** Acciones sobre los vendedores seleccionados. Todo queda como cambio pendiente hasta "Guardar". */
export function BulkActionsBar({
  count,
  prevLabel,
  disabled,
  onSetGoal,
  onAdjust,
  onSetCategory,
  onSetProduct,
  onClearGoal,
  onClearSelection,
}: BulkActionsBarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [goalValue, setGoalValue] = useState('');
  const [percent, setPercent] = useState('5');
  const [base, setBase] = useState<AdjustBase>('previous');

  const close = () => setOpen(null);
  const goal = parseAmount(goalValue);
  const pct = parseAmount(percent);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <span className="mr-1 text-sm font-medium">
        {count.toLocaleString('es-MX')} seleccionado{count !== 1 ? 's' : ''}
      </span>

      <Popover open={open === 'goal'} onOpenChange={o => setOpen(o ? 'goal' : null)}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5">
            <Target className="h-4 w-4" /> Asignar meta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start">
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault();
              if (goal && goal > 0) {
                onSetGoal(Math.round(goal));
                close();
              }
            }}
          >
            <Label htmlFor="bulk-goal">Meta para los {count.toLocaleString('es-MX')} seleccionados</Label>
            <Input
              id="bulk-goal"
              inputMode="numeric"
              placeholder="$200,000"
              value={goalValue}
              onChange={e => setGoalValue(e.target.value)}
              autoFocus
            />
            <Button type="submit" size="sm" className="w-full" disabled={!goal || goal <= 0}>
              Aplicar
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Popover open={open === 'adjust'} onOpenChange={o => setOpen(o ? 'adjust' : null)}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5">
            <Percent className="h-4 w-4" /> Ajustar %
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault();
              if (pct !== null) {
                onAdjust(pct, base);
                close();
              }
            }}
          >
            <div className="space-y-2">
              <Label>Partir de</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['previous', `Meta de ${prevLabel}`],
                    ['current', 'Meta actual'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={base === value ? 'default' : 'outline'}
                    onClick={() => setBase(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-pct">Ajuste (%)</Label>
              <Input
                id="bulk-pct"
                inputMode="decimal"
                value={percent}
                onChange={e => setPercent(e.target.value)}
                placeholder="5 o -10"
              />
              <p className="text-xs text-muted-foreground">
                Se redondea a centenas. Los vendedores sin meta base se omiten.
              </p>
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={pct === null}>
              Aplicar
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Popover open={open === 'category'} onOpenChange={o => setOpen(o ? 'category' : null)}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5">
            <Tag className="h-4 w-4" /> Categoría
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {CATEGORIES.map(c => (
            <Button
              key={c.value}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onSetCategory(c.value);
                close();
              }}
            >
              {c.label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={open === 'product'} onOpenChange={o => setOpen(o ? 'product' : null)}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5">
            <Package className="h-4 w-4" /> Producto
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {PRODUCTS.map(p => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onSetProduct(p.value);
                close();
              }}
            >
              {p.label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5" onClick={onClearGoal}>
        <Trash2 className="h-4 w-4" /> Quitar meta
      </Button>

      <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={onClearSelection}>
        <X className="h-4 w-4" /> Limpiar selección
      </Button>
    </div>
  );
}
