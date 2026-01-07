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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateFinalBonus, GOAL_ACHIEVEMENT_LEVELS } from '@/lib/incentives-config';
import type {
  UserCategory,
  QualityMultiplier,
  GrowthMultiplier,
  SalesProjection,
} from '@/lib/types';
import { Plus, Trash2, LineChart, Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default function ProyeccionesPage() {
  const [projections, setProjections] = useState<SalesProjection[]>([]);
  const [newProjection, setNewProjection] = useState({
    month: MONTHS[new Date().getMonth()],
    projectedColocacion: 300000,
    projectedMeta: 300000,
    category: 'G4' as UserCategory,
    qualityMultiplier: 'B' as QualityMultiplier,
    growthMultiplier: 'B' as GrowthMultiplier,
  });

  const addProjection = () => {
    const calculation = calculateFinalBonus(
      newProjection.projectedColocacion,
      newProjection.projectedMeta,
      newProjection.category,
      newProjection.qualityMultiplier,
      newProjection.growthMultiplier
    );

    const projection: SalesProjection = {
      month: newProjection.month,
      projectedColocacion: newProjection.projectedColocacion,
      projectedMeta: newProjection.projectedMeta,
      projectedBonus: calculation.bonusFinal,
      category: newProjection.category,
      qualityMultiplier: newProjection.qualityMultiplier,
      growthMultiplier: newProjection.growthMultiplier,
    };

    setProjections([...projections, projection]);
  };

  const removeProjection = (index: number) => {
    setProjections(projections.filter((_, i) => i !== index));
  };

  const totalProjectedBonus = projections.reduce((sum, p) => sum + p.projectedBonus, 0);
  const totalProjectedColocacion = projections.reduce((sum, p) => sum + p.projectedColocacion, 0);

  const chartData = projections.map(p => ({
    name: p.month,
    Colocación: p.projectedColocacion,
    Bono: p.projectedBonus,
  }));

  const getLevelForProjection = (colocacion: number, meta: number) => {
    const percentage = meta > 0 ? (colocacion / meta) * 100 : 0;
    const level = GOAL_ACHIEVEMENT_LEVELS.find(l => {
      if (l.maxPercentage === null) {
        return percentage >= l.minPercentage;
      }
      return percentage >= l.minPercentage && percentage < l.maxPercentage;
    });
    return level?.label || 'N/A';
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <LineChart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Proyecciones de Venta</h1>
            <p className="text-sm text-white/90">
              Planifica tus ventas y proyecta tus incentivos
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Summary Cards */}
          {projections.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Proyecciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{projections.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">meses proyectados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Colocación Total Proyectada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(totalProjectedColocacion)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Bonos Totales Proyectados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-secondary">
                    {formatCurrency(totalProjectedBonus)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chart */}
          {projections.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gráfica de Proyecciones</CardTitle>
                    <CardDescription>Visualiza tus colocaciones y bonos proyectados</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    Colocación: { label: 'Colocación', color: 'hsl(var(--primary))' },
                    Bono: { label: 'Bono', color: 'hsl(var(--secondary))' },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={value => `$${Number(value) / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={value => formatCurrency(Number(value))} />}
                      />
                      <Legend />
                      <Bar dataKey="Colocación" fill="hsl(var(--primary))" radius={4} />
                      <Bar dataKey="Bono" fill="hsl(var(--secondary))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Add Projection Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Proyección
              </CardTitle>
              <CardDescription>Agrega una proyección de venta para un mes específico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <Select
                    value={newProjection.month}
                    onValueChange={month => setNewProjection({ ...newProjection, month })}
                  >
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colocacion">Colocación Proyectada</Label>
                  <Input
                    id="colocacion"
                    type="number"
                    value={newProjection.projectedColocacion}
                    onChange={e =>
                      setNewProjection({
                        ...newProjection,
                        projectedColocacion: Number(e.target.value),
                      })
                    }
                    step={10000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta-proj">Meta</Label>
                  <Input
                    id="meta-proj"
                    type="number"
                    value={newProjection.projectedMeta}
                    onChange={e =>
                      setNewProjection({ ...newProjection, projectedMeta: Number(e.target.value) })
                    }
                    step={10000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-proj">Categoría</Label>
                  <Select
                    value={newProjection.category}
                    onValueChange={category =>
                      setNewProjection({ ...newProjection, category: category as UserCategory })
                    }
                  >
                    <SelectTrigger id="category-proj">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G1">G1</SelectItem>
                      <SelectItem value="G2">G2</SelectItem>
                      <SelectItem value="G3">G3</SelectItem>
                      <SelectItem value="G4">G4 - Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality-proj">Calidad</Label>
                  <Select
                    value={newProjection.qualityMultiplier}
                    onValueChange={quality =>
                      setNewProjection({
                        ...newProjection,
                        qualityMultiplier: quality as QualityMultiplier,
                      })
                    }
                  >
                    <SelectTrigger id="quality-proj">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Excelente (×1.20)</SelectItem>
                      <SelectItem value="B">B - Buena (×1.00)</SelectItem>
                      <SelectItem value="C">C - Regular (×0.60)</SelectItem>
                      <SelectItem value="D">D - Deficiente (×0.00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="growth-proj">Crecimiento</Label>
                  <Select
                    value={newProjection.growthMultiplier}
                    onValueChange={growth =>
                      setNewProjection({
                        ...newProjection,
                        growthMultiplier: growth as GrowthMultiplier,
                      })
                    }
                  >
                    <SelectTrigger id="growth-proj">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Excelente (×1.15)</SelectItem>
                      <SelectItem value="B">B - Bueno (×1.00)</SelectItem>
                      <SelectItem value="C">C - Regular (×0.80)</SelectItem>
                      <SelectItem value="D">D - Bajo (×0.60)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={addProjection} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Proyección
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Projections Table */}
          {projections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tus Proyecciones</CardTitle>
                <CardDescription>Revisa y gestiona todas tus proyecciones de venta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mes</TableHead>
                        <TableHead className="text-right">Colocación</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead className="text-center">Cat.</TableHead>
                        <TableHead className="text-center">Calidad</TableHead>
                        <TableHead className="text-center">Crecimiento</TableHead>
                        <TableHead className="text-right">Bono Proyectado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projections.map((proj, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{proj.month}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(proj.projectedColocacion)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(proj.projectedMeta)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getLevelForProjection(proj.projectedColocacion, proj.projectedMeta)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{proj.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn({
                                'bg-green-500 text-white': proj.qualityMultiplier === 'A',
                                'bg-blue-500 text-white': proj.qualityMultiplier === 'B',
                                'bg-yellow-500 text-black': proj.qualityMultiplier === 'C',
                                'bg-red-500 text-white': proj.qualityMultiplier === 'D',
                              })}
                            >
                              {proj.qualityMultiplier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn({
                                'bg-green-500 text-white': proj.growthMultiplier === 'A',
                                'bg-blue-500 text-white': proj.growthMultiplier === 'B',
                                'bg-yellow-500 text-black': proj.growthMultiplier === 'C',
                                'bg-red-500 text-white': proj.growthMultiplier === 'D',
                              })}
                            >
                              {proj.growthMultiplier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(proj.projectedBonus)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProjection(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {projections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No hay proyecciones aún
                </p>
                <p className="text-sm text-muted-foreground">
                  Comienza agregando tu primera proyección de venta
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
