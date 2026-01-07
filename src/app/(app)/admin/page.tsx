'use client';

import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Save, RefreshCw, Users, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  getIncentiveConfig,
  updateIncentiveConfig,
  initializeDefaultConfig,
  getAllUserGoals,
  saveUserGoal,
  getAllUsers,
  updateUserProfile,
} from '@/lib/firestore-service';
import type {
  GoalAchievementConfig,
  QualityMultiplierConfig,
  GrowthMultiplierConfig,
  UserGoalConfig,
  UserCategory,
  ProductType,
} from '@/lib/types';
import { PRODUCTS } from '@/lib/types';
import {
  GOAL_ACHIEVEMENT_LEVELS,
  QUALITY_MULTIPLIERS,
  GROWTH_MULTIPLIERS,
} from '@/lib/incentives-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function AdminContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuraciones
  const [goalLevels, setGoalLevels] = useState<GoalAchievementConfig[]>([]);
  const [qualityMults, setQualityMults] = useState<QualityMultiplierConfig[]>([]);
  const [growthMults, setGrowthMults] = useState<GrowthMultiplierConfig[]>([]);
  const [userGoals, setUserGoals] = useState<(UserGoalConfig & { id: string })[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);

  // Nueva meta de usuario
  const [newGoal, setNewGoal] = useState({
    userId: '',
    monthlyGoal: 300000,
    category: 'G4' as UserCategory,
    product: undefined as ProductType | undefined,
    period: new Date().toISOString().slice(0, 7),
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const config = await getIncentiveConfig();
      setGoalLevels(config.goalAchievementLevels || GOAL_ACHIEVEMENT_LEVELS);
      setQualityMults(config.qualityMultipliers || QUALITY_MULTIPLIERS);
      setGrowthMults(config.growthMultipliers || GROWTH_MULTIPLIERS);

      const goals = await getAllUserGoals();
      setUserGoals(goals);

      const users = await getAllUsers();
      setRegisteredUsers(users);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await updateIncentiveConfig({
        goalAchievementLevels: goalLevels,
        qualityMultipliers: qualityMults,
        growthMultipliers: growthMults,
      });
      toast({
        title: 'Éxito',
        description: 'Configuración guardada correctamente',
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Estás seguro de restaurar los valores por defecto?')) {
      try {
        setSaving(true);
        await initializeDefaultConfig();
        await loadConfigurations();
        toast({
          title: 'Éxito',
          description: 'Valores por defecto restaurados',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron restaurar los valores',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const updateGoalLevel = (index: number, field: string, value: any) => {
    const updated = [...goalLevels];
    if (field.startsWith('bonusPercentages.')) {
      const category = field.split('.')[1];
      updated[index] = {
        ...updated[index],
        bonusPercentages: {
          ...updated[index].bonusPercentages,
          [category]: Number(value),
        },
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setGoalLevels(updated);
  };

  const updateQualityMult = (index: number, value: number) => {
    const updated = [...qualityMults];
    updated[index] = { ...updated[index], value: Number(value) };
    setQualityMults(updated);
  };

  const updateGrowthMult = (index: number, value: number) => {
    const updated = [...growthMults];
    updated[index] = { ...updated[index], value: Number(value) };
    setGrowthMults(updated);
  };

  const handleAddUserGoal = async () => {
    if (!newGoal.userId) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un ID de usuario',
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveUserGoal(newGoal);
      await loadConfigurations();
      toast({
        title: 'Éxito',
        description: `Meta configurada para usuario ${newGoal.userId}`,
      });
      setNewGoal({
        userId: '',
        monthlyGoal: 300000,
        category: 'G4',
        period: new Date().toISOString().slice(0, 7),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la meta',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sm text-white/90">
              Configura todos los valores del sistema de incentivos
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleResetDefaults} disabled={saving}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar Defaults
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>

          <Tabs defaultValue="registered-users" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="registered-users">Usuarios Registrados</TabsTrigger>
              <TabsTrigger value="goal-levels">Niveles</TabsTrigger>
              <TabsTrigger value="quality">Calidad</TabsTrigger>
              <TabsTrigger value="growth">Crecimiento</TabsTrigger>
              <TabsTrigger value="users">Metas</TabsTrigger>
            </TabsList>

            {/* Registered Users */}
            <TabsContent value="registered-users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuarios Registrados en el Sistema
                  </CardTitle>
                  <CardDescription>
                    Gestiona los usuarios registrados, sus categorías y productos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {registeredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registeredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.category || ''}
                                  onValueChange={async (value) => {
                                    try {
                                      await updateUserProfile(user.id, { category: value });
                                      await loadConfigurations();
                                      toast({
                                        title: 'Éxito',
                                        description: 'Categoría actualizada',
                                      });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: 'No se pudo actualizar la categoría',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="G1">G1</SelectItem>
                                    <SelectItem value="G2">G2</SelectItem>
                                    <SelectItem value="G3">G3</SelectItem>
                                    <SelectItem value="G4">G4 - Elite</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.product || ''}
                                  onValueChange={async (value) => {
                                    try {
                                      await updateUserProfile(user.id, { product: value });
                                      await loadConfigurations();
                                      toast({
                                        title: 'Éxito',
                                        description: 'Producto actualizado',
                                      });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: 'No se pudo actualizar el producto',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Seleccionar producto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRODUCTS.map((product) => (
                                      <SelectItem key={product.value} value={product.value}>
                                        {product.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNewGoal({
                                      ...newGoal,
                                      userId: user.id,
                                      category: (user.category as UserCategory) || 'G4',
                                      product: user.product,
                                    });
                                  }}
                                >
                                  Asignar Meta
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados aún
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Goal Achievement Levels */}
            <TabsContent value="goal-levels" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Porcentajes de Bono Base por Nivel y Categoría</CardTitle>
                  <CardDescription>
                    Edita los porcentajes según el cumplimiento de meta y categoría del usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nivel</TableHead>
                          <TableHead>Min %</TableHead>
                          <TableHead>Max %</TableHead>
                          <TableHead>G1 (%)</TableHead>
                          <TableHead>G2 (%)</TableHead>
                          <TableHead>G3 (%)</TableHead>
                          <TableHead>G4 (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalLevels.map((level, index) => (
                          <TableRow key={level.level}>
                            <TableCell>
                              <Badge variant="outline">{level.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={level.minPercentage}
                                onChange={e =>
                                  updateGoalLevel(index, 'minPercentage', Number(e.target.value))
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={level.maxPercentage || ''}
                                onChange={e =>
                                  updateGoalLevel(
                                    index,
                                    'maxPercentage',
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                                className="w-20"
                                placeholder="∞"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={level.bonusPercentages.G1}
                                onChange={e =>
                                  updateGoalLevel(index, 'bonusPercentages.G1', e.target.value)
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={level.bonusPercentages.G2}
                                onChange={e =>
                                  updateGoalLevel(index, 'bonusPercentages.G2', e.target.value)
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={level.bonusPercentages.G3}
                                onChange={e =>
                                  updateGoalLevel(index, 'bonusPercentages.G3', e.target.value)
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={level.bonusPercentages.G4}
                                onChange={e =>
                                  updateGoalLevel(index, 'bonusPercentages.G4', e.target.value)
                                }
                                className="w-20"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quality Multipliers */}
            <TabsContent value="quality" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Multiplicadores de Calidad</CardTitle>
                  <CardDescription>
                    La mejor originación se traduce en la mejor cobranza
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {qualityMults.map((mult, index) => (
                      <div
                        key={mult.level}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">
                            Calidad {mult.level}
                          </p>
                          <p className="text-sm text-muted-foreground">{mult.label}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Label htmlFor={`quality-${mult.level}`}>Multiplicador:</Label>
                          <Input
                            id={`quality-${mult.level}`}
                            type="number"
                            step="0.01"
                            value={mult.value}
                            onChange={e => updateQualityMult(index, Number(e.target.value))}
                            className="w-24"
                          />
                          <Badge>×{mult.value.toFixed(2)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Growth Multipliers */}
            <TabsContent value="growth" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Multiplicadores de Crecimiento</CardTitle>
                  <CardDescription>
                    El servicio y lealtad del cliente se reflejan en renovaciones y crecimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {growthMults.map((mult, index) => (
                      <div
                        key={mult.level}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">
                            Crecimiento {mult.level}
                          </p>
                          <p className="text-sm text-muted-foreground">{mult.label}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Label htmlFor={`growth-${mult.level}`}>Multiplicador:</Label>
                          <Input
                            id={`growth-${mult.level}`}
                            type="number"
                            step="0.01"
                            value={mult.value}
                            onChange={e => updateGrowthMult(index, Number(e.target.value))}
                            className="w-24"
                          />
                          <Badge>×{mult.value.toFixed(2)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Goals */}
            <TabsContent value="users" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Agregar Meta de Usuario
                  </CardTitle>
                  <CardDescription>
                    Configura la meta mensual y categoría para un usuario específico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                          <SelectItem value="G1">G1</SelectItem>
                          <SelectItem value="G2">G2</SelectItem>
                          <SelectItem value="G3">G3</SelectItem>
                          <SelectItem value="G4">G4 - Elite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product">Producto</Label>
                      <Select
                        value={newGoal.product || ''}
                        onValueChange={product =>
                          setNewGoal({ ...newGoal, product: product as ProductType })
                        }
                      >
                        <SelectTrigger id="product">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCTS.map((product) => (
                            <SelectItem key={product.value} value={product.value}>
                              {product.label}
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

                  <div className="mt-4">
                    <Button onClick={handleAddUserGoal} className="w-full">
                      Agregar Meta
                    </Button>
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
                            <TableHead>Producto</TableHead>
                            <TableHead>Periodo</TableHead>
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
                              <TableCell>
                                {goal.product ? (
                                  <Badge variant="outline">
                                    {PRODUCTS.find(p => p.value === goal.product)?.label || goal.product}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No asignado</span>
                                )}
                              </TableCell>
                              <TableCell>{goal.period}</TableCell>
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminContent />
    </ProtectedRoute>
  );
}
