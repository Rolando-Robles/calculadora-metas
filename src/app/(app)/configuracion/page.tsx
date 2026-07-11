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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Target, Percent, Save } from 'lucide-react';
import {
  GOAL_ACHIEVEMENT_LEVELS,
  QUALITY_MULTIPLIERS,
  GROWTH_MULTIPLIERS,
} from '@/lib/incentives-config';
import type { UserCategory, UserGoalConfig } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const [userGoals, setUserGoals] = useState<UserGoalConfig[]>([
    {
      userId: 'user-001',
      monthlyGoal: 300000,
      category: 'G4',
      period: '2024-01',
    },
  ]);

  const [newGoal, setNewGoal] = useState({
    userId: '',
    monthlyGoal: 300000,
    category: 'G4' as UserCategory,
    period: new Date().toISOString().slice(0, 7),
  });

  const addUserGoal = () => {
    if (!newGoal.userId) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un ID de usuario',
        variant: 'destructive',
      });
      return;
    }

    setUserGoals([...userGoals, { ...newGoal }]);
    toast({
      title: 'Meta agregada',
      description: `Meta configurada para usuario ${newGoal.userId}`,
    });

    // Reset form
    setNewGoal({
      userId: '',
      monthlyGoal: 300000,
      category: 'G4',
      period: new Date().toISOString().slice(0, 7),
    });
  };

  const removeUserGoal = (index: number) => {
    const goal = userGoals[index];
    setUserGoals(userGoals.filter((_, i) => i !== index));
    toast({
      title: 'Meta eliminada',
      description: `Meta del usuario ${goal.userId} eliminada`,
    });
  };

  const saveConfiguration = () => {
    toast({
      title: 'Configuración guardada',
      description: 'Los cambios se han guardado correctamente',
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuración</h1>
            <p className="text-sm text-white/90">
              Administra metas de usuarios y parámetros de incentivos
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="goals" className="gap-2">
                <Target className="h-4 w-4" />
                Metas de Usuarios
              </TabsTrigger>
              <TabsTrigger value="multipliers" className="gap-2">
                <Percent className="h-4 w-4" />
                Multiplicadores
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Users className="h-4 w-4" />
                Categorías
              </TabsTrigger>
            </TabsList>

            {/* User Goals Tab */}
            <TabsContent value="goals" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Meta de Usuario</CardTitle>
                  <CardDescription>
                    Configura la meta mensual y categoría para un usuario específico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="userId">ID de Usuario</Label>
                      <Input
                        id="userId"
                        placeholder="user-001"
                        value={newGoal.userId}
                        onChange={e => setNewGoal({ ...newGoal, userId: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyGoal">Meta Mensual</Label>
                      <Input
                        id="monthlyGoal"
                        type="number"
                        value={newGoal.monthlyGoal}
                        onChange={e =>
                          setNewGoal({ ...newGoal, monthlyGoal: Number(e.target.value) })
                        }
                        step={10000}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Select
                        value={newGoal.category}
                        onValueChange={category =>
                          setNewGoal({ ...newGoal, category: category as UserCategory })
                        }
                      >
                        <SelectTrigger id="category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period">Periodo</Label>
                      <Input
                        id="period"
                        type="month"
                        value={newGoal.period}
                        onChange={e => setNewGoal({ ...newGoal, period: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={addUserGoal}>Agregar Meta</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metas Configuradas</CardTitle>
                  <CardDescription>Lista de todas las metas de usuarios activas</CardDescription>
                </CardHeader>
                <CardContent>
                  {userGoals.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-right">Meta Mensual</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userGoals.map((goal, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{goal.userId}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(goal.monthlyGoal)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{goal.category}</Badge>
                              </TableCell>
                              <TableCell>{goal.period}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeUserGoal(index)}
                                  className="text-destructive"
                                >
                                  Eliminar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay metas configuradas aún
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Multipliers Tab */}
            <TabsContent value="multipliers" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Multiplicadores de Calidad</CardTitle>
                  <CardDescription>
                    La mejor originación se traduce en la mejor cobranza
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Multiplicador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {QUALITY_MULTIPLIERS.map(q => (
                        <TableRow key={q.level}>
                          <TableCell>
                            <Badge
                              className={
                                q.level === 'A'
                                  ? 'bg-green-500'
                                  : q.level === 'B'
                                    ? 'bg-blue-500'
                                    : q.level === 'C'
                                      ? 'bg-yellow-500 text-black'
                                      : 'bg-red-500'
                              }
                            >
                              {q.level}
                            </Badge>
                          </TableCell>
                          <TableCell>{q.label}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ×{q.value.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multiplicadores de Crecimiento</CardTitle>
                  <CardDescription>
                    El servicio y lealtad del cliente se reflejan en renovaciones y crecimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Multiplicador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {GROWTH_MULTIPLIERS.map(g => (
                        <TableRow key={g.level}>
                          <TableCell>
                            <Badge
                              className={
                                g.level === 'A'
                                  ? 'bg-green-500'
                                  : g.level === 'B'
                                    ? 'bg-blue-500'
                                    : g.level === 'C'
                                      ? 'bg-yellow-500 text-black'
                                      : 'bg-red-500'
                              }
                            >
                              {g.level}
                            </Badge>
                          </TableCell>
                          <TableCell>{g.label}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ×{g.value.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Porcentajes de Bono Base por Categoría</CardTitle>
                  <CardDescription>
                    Según el nivel de cumplimiento de meta y categoría asignada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cumplimiento Meta</TableHead>
                          <TableHead>Nivel</TableHead>
                          {CATEGORIES.map((cat) => (
                            <TableHead key={cat.value} className="text-center">
                              {cat.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {GOAL_ACHIEVEMENT_LEVELS.map(level => (
                          <TableRow key={level.level}>
                            <TableCell>
                              {level.maxPercentage
                                ? `${level.minPercentage}% - ${level.maxPercentage}%`
                                : `≥${level.minPercentage}%`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{level.label}</Badge>
                            </TableCell>
                            {CATEGORIES.map((cat) => (
                              <TableCell key={cat.value} className="text-center font-semibold">
                                {level.bonusPercentages[cat.value]}%
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm">Nota Importante</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Las categorías y porcentajes están configurados según el programa{' '}
                    <span className="font-semibold text-primary">
                      &quot;Originadores de Excelencia&quot;
                    </span>
                    . Los cambios a estos valores requieren aprobación administrativa.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveConfiguration} size="lg" className="gap-2">
              <Save className="h-4 w-4" />
              Guardar Configuración
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
