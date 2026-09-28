'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addMonths, currentPeriod, formatPeriod, isValidPeriod } from '@/lib/admin-utils';
import { cn } from '@/lib/utils';

interface PeriodPickerProps {
  value: string;
  onChange: (period: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Selector de mes con flechas y accesos rápidos a este mes / el siguiente. */
export function PeriodPicker({ value, onChange, disabled, className }: PeriodPickerProps) {
  const thisMonth = currentPeriod();
  const nextMonth = addMonths(thisMonth, 1);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center rounded-md border bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={disabled}
          onClick={() => onChange(addMonths(value, -1))}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <label className="relative">
          <span className="pointer-events-none block min-w-[9.5rem] px-2 text-center text-sm font-semibold">
            {formatPeriod(value)}
          </span>
          <input
            type="month"
            aria-label="Periodo"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={value}
            disabled={disabled}
            onClick={e => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                // navegadores sin showPicker: se abre el control nativo
              }
            }}
            onChange={e => isValidPeriod(e.target.value) && onChange(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={disabled}
          onClick={() => onChange(addMonths(value, 1))}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {value !== thisMonth && (
        <Button type="button" variant="link" size="sm" className="h-8 px-1" disabled={disabled} onClick={() => onChange(thisMonth)}>
          Este mes
        </Button>
      )}
      {value !== nextMonth && (
        <Button type="button" variant="link" size="sm" className="h-8 px-1" disabled={disabled} onClick={() => onChange(nextMonth)}>
          Próximo mes
        </Button>
      )}
    </div>
  );
}
