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
import { CsvImportDialog } from '@/components/admin/CsvImportDialog';

// Helper para formatear número a moneda con comas
const formatCurrencyInput = (value: string | number): string => {
  if (!value) return '';
  const numValue = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : String(value);
  if (!numValue) return '';
  return Number(numValue).toLocaleString('es-MX');
};

// Helper para obtener el número limpio desde input formateado
const parseFormattedCurrency = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

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
  const [editingGoal, setEditingGoal] = useState<{[key: string]: any}>({});
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [tempGoals, setTempGoals] = useState<{[key: string]: {goal: string, period: string}}>({});

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

  const getUserGoal = (userId: string) => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    return userGoals.find(g => g.userId === userId && g.period === currentPeriod);
  };

  const handleUpdateUserGoal = async (userId: string, field: string, value: any) => {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const existingGoal = getUserGoal(userId);
      const user = registeredUsers.find(u => u.id === userId);

      console.log('📝 Updating goal:', { userId, field, value, existingGoal });

      if (existingGoal) {
        // Update existing goal
        const updatedGoal: UserGoalConfig = {
          userId,
          monthlyGoal: field === 'monthlyGoal' ? Number(value) : existingGoal.monthlyGoal,
          category: field === 'category' ? value : (existingGoal.category || user?.category || 'G4'),
          product: field === 'product' ? value : (existingGoal.product || user?.product),
          period: field === 'period' ? value : existingGoal.period,
        };

        console.log('✏️ Updating existing goal:', updatedGoal);
        await saveUserGoal(updatedGoal);

        // Update local state only
        setUserGoals(prev => {
          const updated = prev.map(g =>
            g.userId === userId && g.period === existingGoal.period
              ? { ...g, ...updatedGoal }
              : g
          );
          console.log('✅ Local state updated:', updated);
          return updated;
        });
      } else {
        // Create new goal
        const newGoal: UserGoalConfig = {
          userId,
          monthlyGoal: field === 'monthlyGoal' ? Number(value) : 300000,
          category: (user?.category as UserCategory) || 'G4',
          product: user?.product,
          period: field === 'period' ? value : currentPeriod,
        };

        console.log('🆕 Creating new goal:', newGoal);
        await saveUserGoal(newGoal);

        // Add to local state
        const goalId = `${userId}-${newGoal.period}`;
        setUserGoals(prev => {
          const updated = [...prev, { ...newGoal, id: goalId }];
          console.log('✅ Local state with new goal:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Error updating goal:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la meta',
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

  const filteredUsers = selectedProductFilter === 'all'
    ? registeredUsers
    : registeredUsers.filter(user => user.product === selectedProductFilter);

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

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Usuarios y Metas</TabsTrigger>
              <TabsTrigger value="goal-levels">Niveles</TabsTrigger>
              <TabsTrigger value="quality">Calidad</TabsTrigger>
              <TabsTrigger value="growth">Crecimiento</TabsTrigger>
            </TabsList>

            {/* Users and Goals Combined */}
            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gestión de Usuarios y Metas
                      </CardTitle>
                      <CardDescription>
                        Administra usuarios, categorías, productos y metas mensuales en un solo lugar
                      </CardDescription>
                    </div>
                    <CsvImportDialog onImportComplete={loadConfigurations} />
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Product Filter */}
                  <div className="mb-6 flex items-center gap-4">
                    <Label htmlFor="product-filter" className="text-sm font-medium">
                      Filtrar por Producto:
                    </Label>
                    <Select
                      value={selectedProductFilter}
                      onValueChange={setSelectedProductFilter}
                    >
                      <SelectTrigger id="product-filter" className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los productos</SelectItem>
                        {PRODUCTS.map((product) => (
                          <SelectItem key={product.value} value={product.value}>
                            {product.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="ml-2">
                      {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

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
                            <TableHead className="text-right">Meta Mensual</TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-center">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => {
                            const userGoal = getUserGoal(user.id);
                            const currentPeriod = new Date().toISOString().slice(0, 7);
                            const tempData = tempGoals[user.id] || {
                              goal: userGoal?.monthlyGoal?.toString() || '',
                              period: userGoal?.period || currentPeriod
                            };

                            return (
                              <TableRow key={`${user.id}-${userGoal?.id || 'no-goal'}`}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell className="text-sm">{user.email}</TableCell>
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
                                        setRegisteredUsers(prev =>
                                          prev.map(u => u.id === user.id ? { ...u, category: value } : u)
                                        );
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
                                      <SelectItem value="G0">G0</SelectItem>
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
                                        setRegisteredUsers(prev =>
                                          prev.map(u => u.id === user.id ? { ...u, product: value } : u)
                                        );
                                      } catch (error) {
                                        toast({
                                          title: 'Error',
                                          description: 'No se pudo actualizar el producto',
                                          variant: 'destructive',
                                        });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-40">
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
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                      $
                                    </span>
                                    <Input
                                      type="text"
                                      className="w-40 text-right pl-8"
                                      placeholder="300,000"
                                      value={formatCurrencyInput(tempData.goal)}
                                      onChange={(e) => {
                                        const cleanValue = parseFormattedCurrency(e.target.value);
                                        setTempGoals(prev => ({
                                          ...prev,
                                          [user.id]: { ...tempData, goal: cleanValue }
                                        }));
                                      }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="month"
                                    className="w-40"
                                    value={tempData.period}
                                    onChange={(e) => setTempGoals(prev => ({
                                      ...prev,
                                      [user.id]: { ...tempData, period: e.target.value }
                                    }))}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (!tempData.goal || !tempData.period) {
                                        toast({
                                          title: 'Error',
                                          description: 'Por favor completa meta y periodo',
                                          variant: 'destructive',
                                        });
                                        return;
                                      }

                                      if (!user.category) {
                                        toast({
                                          title: 'Error',
                                          description: 'Primero asigna una categoría al usuario',
                                          variant: 'destructive',
                                        });
                                        return;
                                      }

                                      try {
                                        const goalToSave: UserGoalConfig = {
                                          userId: user.id,
                                          monthlyGoal: Number(tempData.goal),
                                          category: user.category as UserCategory,
                                          product: user.product,
                                          period: tempData.period,
                                        };

                                        console.log('💾 Saving goal:', goalToSave);
                                        await saveUserGoal(goalToSave);

                                        // Update local state
                                        const goalId = `${user.id}-${tempData.period}`;
                                        setUserGoals(prev => {
                                          const existing = prev.find(g => g.userId === user.id && g.period === tempData.period);
                                          if (existing) {
                                            return prev.map(g =>
                                              g.userId === user.id && g.period === tempData.period
                                                ? { ...goalToSave, id: goalId }
                                                : g
                                            );
                                          } else {
                                            return [...prev, { ...goalToSave, id: goalId }];
                                          }
                                        });

                                        console.log('✅ Goal saved successfully to Firestore');

                                        toast({
                                          title: '✅ Meta guardada',
                                          description: `Meta de ${formatCurrency(Number(tempData.goal))} guardada correctamente`,
                                        });
                                      } catch (error) {
                                        console.error('❌ Error saving goal:', error);
                                        toast({
                                          title: 'Error',
                                          description: 'No se pudo guardar la meta',
                                          variant: 'destructive',
                                        });
                                      }
                                    }}
                                  >
                                    💾 Guardar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
                          <TableHead>G0 (%)</TableHead>
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
                                value={level.bonusPercentages.G0}
                                onChange={e =>
                                  updateGoalLevel(index, 'bonusPercentages.G0', e.target.value)
                                }
                                className="w-20"
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
