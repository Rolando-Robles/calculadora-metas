'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
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
import { Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const kpiData = mockKpiData[timeRange];
  const monthlyData = mockKpiData.month;
  
  const [lastUpdated] = useState(new Date());

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:border-none md:bg-transparent md:px-6 md:pt-4">
        <h1 className="text-3xl font-headline font-bold">Inicio</h1>
        <div className="md:hidden">
          <Fab />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <Tabs
          defaultValue="day"
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[240px]">
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
          <p>Última actualización: {lastUpdated.toLocaleString('es-MX')} · Fuente: HubSpot Sync</p>
        </footer>
      </div>

       <div className="hidden md:block fixed bottom-8 right-8 z-50">
          <Fab />
        </div>
    </div>
  );
}


function Fab() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="rounded-full w-14 h-14 shadow-lg" aria-label="Acciones rápidas">
                    <Plus className="w-6 h-6" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
                <DropdownMenuItem>+ Solicitud</DropdownMenuItem>
                <DropdownMenuItem>+ Aprobada</DropdownMenuItem>
                <DropdownMenuItem>+ Desembolso</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
