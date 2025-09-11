'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { mockIncentiveHistory, mockMonthlyCommissions } from '@/lib/data';
import { Download, ChevronDown } from 'lucide-react';
import type { IncentivePeriod, MonthlyCommission } from '@/lib/types';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};
  

export default function IncentivosPage() {
    const [year, setYear] = useState('Año Actual');

    const totalHistoric = mockIncentiveHistory.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalCurrentMonth = mockIncentiveHistory.length > 0 ? mockIncentiveHistory[0].totalPaid : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 flex h-20 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:py-4">
        <h1 className="text-headline-lg font-bold">Mis Incentivos</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Acumulado Histórico</CardTitle>
                    <CardDescription>Total de comisiones ganadas</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold font-headline">{formatCurrency(totalHistoric)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Mes Pasado</CardTitle>
                    <CardDescription>Comisión total del último ciclo cerrado</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold font-headline text-accent">{formatCurrency(totalCurrentMonth)}</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Comisiones por Mes</CardTitle>
                <CardDescription>Resumen de los últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={mockMonthlyCommissions}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(value) => `$${Number(value) / 1000}k`}
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                            />
                            <Bar dataKey="commission" fill="hsl(var(--secondary))" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Detalle de comisiones por periodo.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                {year}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setYear('Año Actual')}>Año Actual</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setYear('Año Anterior')}>Año Anterior</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Exportar</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-right">Comisión Base</TableHead>
                            <TableHead className="text-right">Multiplicador</TableHead>
                            <TableHead className="text-right">Total Pagado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockIncentiveHistory.map((item) => (
                            <TableRow key={item.period}>
                                <TableCell className="font-medium capitalize">{item.period}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.baseCommission)}</TableCell>
                                <TableCell className="text-right">{item.multiplier}x</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.totalPaid)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
