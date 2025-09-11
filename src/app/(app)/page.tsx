'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { GoalDonutChart } from '@/components/dashboard/goal-donut-chart';
import { SalesLineChart } from '@/components/dashboard/sales-line-chart';
import { DailyRecommendations } from '@/components/dashboard/daily-recommendations';
import { mockKpiData, mockThirtyDayData } from '@/lib/data';
import type { TimeRange } from '@/lib/types';

export default function HomePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const kpiData = mockKpiData[timeRange];
  const monthlyData = mockKpiData.month;
  
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // This will only run on the client, after initial hydration
    // to avoid hydration mismatch with server-rendered content
    const getFormattedDate = () => {
      try {
        return new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Mexico_City',
        }).format(new Date());
      } catch (e) {
        // Fallback for environments that might not support the timeZone option
        return new Date().toLocaleString('es-MX');
      }
    };
    setLastUpdated(getFormattedDate());
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:border-none md:bg-transparent md:px-6 md:py-4">
        <h1 className="text-headline-lg font-bold">Inicio</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <Tabs
          defaultValue="day"
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 md:max-w-xs">
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard kpi={kpiData.requests} />
          <KpiCard kpi={kpiData.approved} />
          <KpiCard kpi={kpiData.disbursed} />
          <KpiCard kpi={kpiData.amount} formatAsCurrency />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
             <SalesLineChart data={mockThirtyDayData} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <GoalDonutChart current={monthlyData.amount.value} goal={monthlyData.amount.goal} />
          </div>
        </div>

        <div className="grid gap-6">
          <DailyRecommendations />
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-4">
          <p>Última actualización: {lastUpdated || 'Cargando...'} · Fuente: HubSpot</p>
        </footer>
      </div>
    </div>
  );
}
