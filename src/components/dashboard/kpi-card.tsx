import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress, ProgressIndicator } from '@/components/ui/progress';
import { Kpi } from '@/lib/types';
import { cn } from '@/lib/utils';
import React from 'react';

interface KpiCardProps {
  kpi: Kpi;
  formatAsCurrency?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function KpiCard({ kpi, formatAsCurrency = false }: KpiCardProps) {
  const progress = kpi.goal > 0 ? (kpi.value / kpi.goal) * 100 : 0;
  
  const getProgressColor = (p: number) => {
    if (p < 40) return 'bg-red-500';
    if (p < 75) return 'bg-yellow-500';
    return 'bg-accent';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{kpi.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">
          {formatAsCurrency ? formatCurrency(kpi.value) : kpi.value.toLocaleString('es-MX')}
        </div>
        <div className="text-xs text-muted-foreground flex justify-between mt-1">
          <span>
            Meta: {formatAsCurrency ? formatCurrency(kpi.goal) : kpi.goal.toLocaleString('es-MX')}
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-2 mt-2 bg-muted">
          <ProgressIndicator
            className={cn('h-full w-full flex-1 transition-all', getProgressColor(progress))}
            style={{ transform: `translateX(-${100 - (progress || 0)}%)` }}
          />
        </Progress>
      </CardContent>
    </Card>
  );
}
