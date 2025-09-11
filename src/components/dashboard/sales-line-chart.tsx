'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartData } from '@/lib/types';

interface SalesLineChartProps {
  data: ChartData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SalesLineChart({ data }: SalesLineChartProps) {
    const goalLine = data.length > 0 ? data[0].goal : 0;
    
    const chartConfig = {
      value: { label: 'Monto', color: 'hsl(var(--secondary))' },
      goal: { label: 'Meta', color: 'hsl(var(--destructive))' },
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Monto Desembolsado (Últimos 30 días)</CardTitle>
        <CardDescription>
          Ritmo diario vs. meta diaria de {formatCurrency(goalLine)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 6)}
            />
             <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${Number(value) / 1000}k`}
             />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" labelFormatter={(label, payload) => `${payload[0]?.payload.date}`} formatter={(value) => formatCurrency(Number(value))}/>}
            />
            <defs>
                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                </linearGradient>
            </defs>
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              stroke="var(--color-value)"
              stackId="a"
              strokeWidth={2}
            />
            <ReferenceLine y={goalLine} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
    );
}
