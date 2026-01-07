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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateFinalBonus, GOAL_ACHIEVEMENT_LEVELS } from '@/lib/incentives-config';
import type {
  UserCategory,
  QualityMultiplier,
  GrowthMultiplier,
} from '@/lib/types';
import { Sparkles, Target, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGoals } from '@/lib/firestore-service';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface Scenario {
  name: string;
  icon: React.ReactNode;
  description: string;
  colocacion: number;
  meta: number;
  category: UserCategory;
  qualityMultiplier: QualityMultiplier;
  growthMultiplier: GrowthMultiplier;
  bonus: number;
  achievementLevel: string;
  color: string;
}

export default function ProyeccionesPage() {
  const { user, userProfile } = useAuth();
  const [targetBonus, setTargetBonus] = useState<number>(50000);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [userGoal, setUserGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserGoal = async () => {
      if (!user) {
        console.log('❌ No user logged in');
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Loading goals for user:', user.uid);
        const goals = await getUserGoals(user.uid);
        console.log('📋 All goals loaded:', goals);

        const currentPeriod = new Date().toISOString().slice(0, 7);
        console.log('📅 Current period:', currentPeriod);

        const currentGoal = goals.find(g => g.period === currentPeriod);
        console.log('🎯 Found goal for current period:', currentGoal);

        setUserGoal(currentGoal || null);
      } catch (error) {
        console.error('❌ Error loading user goal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserGoal();
  }, [user]);

  const generateScenarios = () => {
    if (!userGoal) {
      return;
    }

    const newScenarios: Scenario[] = [];
    const userCategory = userGoal.category || 'G4';

    // Scenario 1: Conservative - Higher colocación, basic multipliers
    const conservative = generateScenario(
      targetBonus,
      userCategory as UserCategory,
      'B' as QualityMultiplier,
      'B' as GrowthMultiplier,
      1.0,
      userGoal.monthlyGoal
    );
    newScenarios.push({
      name: 'Escenario Conservador',
      icon: <Target className="h-5 w-5" />,
      description: 'Mayor colocación con multiplicadores básicos. Enfoque en volumen.',
      ...conservative,
      color: 'bg-blue-500',
    });

    // Scenario 2: Balanced - Moderate colocación, better quality
    const balanced = generateScenario(
      targetBonus,
      userCategory as UserCategory,
      'A' as QualityMultiplier,
      'B' as GrowthMultiplier,
      0.85,
      userGoal.monthlyGoal
    );
    newScenarios.push({
      name: 'Escenario Balanceado',
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'Equilibrio entre colocación y calidad. Estrategia mixta.',
      ...balanced,
      color: 'bg-primary',
    });

    // Scenario 3: Optimized - Best multipliers, lower colocación
    const optimized = generateScenario(
      targetBonus,
      userCategory as UserCategory,
      'A' as QualityMultiplier,
      'A' as GrowthMultiplier,
      0.73,
      userGoal.monthlyGoal
    );
    newScenarios.push({
      name: 'Escenario Optimizado',
      icon: <Zap className="h-5 w-5" />,
      description: 'Maximiza calidad y crecimiento. Menor colocación requerida.',
      ...optimized,
      color: 'bg-secondary',
    });

    setScenarios(newScenarios);
  };

  const generateScenario = (
    target: number,
    category: UserCategory,
    quality: QualityMultiplier,
    growth: GrowthMultiplier,
    multiplier: number,
    userMeta: number
  ) => {
    // Estimate colocación needed based on target bonus
    // Working backwards from: bonus = colocación × bonusBase% × quality × growth
    const qualityValues = { A: 1.2, B: 1.0, C: 0.6, D: 0.0 };
    const growthValues = { A: 1.15, B: 1.0, C: 0.8, D: 0.6 };

    // Assume "Elite" level (>150%) which gives 4% bonus for G4
    const bonusBasePercentage = 0.04; // 4% for Elite G4

    const totalMultiplier = bonusBasePercentage * qualityValues[quality] * growthValues[growth];
    let estimatedColocacion = target / totalMultiplier;

    // Apply adjustment multiplier
    estimatedColocacion = estimatedColocacion * multiplier;

    // Round to nice numbers
    estimatedColocacion = Math.ceil(estimatedColocacion / 10000) * 10000;

    // Calculate actual bonus using the user's real meta
    const calculation = calculateFinalBonus(
      estimatedColocacion,
      userMeta,
      category,
      quality,
      growth
    );

    const achievementPercentage = (estimatedColocacion / userMeta) * 100;
    const level = GOAL_ACHIEVEMENT_LEVELS.find(l => {
      if (l.maxPercentage === null) {
        return achievementPercentage >= l.minPercentage;
      }
      return achievementPercentage >= l.minPercentage && achievementPercentage < l.maxPercentage;
    });

    return {
      colocacion: estimatedColocacion,
      meta: userMeta,
      category,
      qualityMultiplier: quality,
      growthMultiplier: growth,
      bonus: calculation.bonusFinal,
      achievementLevel: level?.label || 'N/A',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando tus metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Proyecciones Inspiracionales</h1>
            <p className="text-sm text-white/90">
              Define tu meta y descubre cómo alcanzarla
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* No Goal Warning */}
          {!userGoal ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>No tienes una meta asignada</strong> para el mes actual.
                Por favor contacta a tu administrador para que te asigne una meta mensual y puedas usar las proyecciones.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* User Goal Info */}
              <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/10 to-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tu Meta Mensual</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(userGoal.monthlyGoal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Categoría</p>
                      <Badge variant="secondary" className="text-lg px-3 py-1">{userGoal.category}</Badge>
                    </div>
                    {userGoal.product && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Producto</p>
                        <Badge variant="outline" className="text-sm">{userGoal.product}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Target Input Card */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Define tu Meta de Ingresos
                  </CardTitle>
                  <CardDescription>
                    Ingresa el bono mensual que deseas alcanzar y te mostraremos 3 escenarios diferentes para lograrlo basados en tu meta real de {formatCurrency(userGoal.monthlyGoal)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="target">Bono Mensual Deseado</Label>
                      <Input
                        id="target"
                        type="number"
                        value={targetBonus}
                        onChange={e => setTargetBonus(Number(e.target.value))}
                        step={5000}
                        className="text-lg font-semibold"
                        placeholder="Ej: 50000"
                      />
                      <p className="text-sm text-muted-foreground">
                        Bono objetivo: <span className="font-bold text-primary">{formatCurrency(targetBonus)}</span>
                      </p>
                    </div>
                    <Button
                      onClick={generateScenarios}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generar Escenarios
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Info Alert */}
              {scenarios.length === 0 && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>¿Cómo funciona?</strong> Ingresa el bono que deseas ganar y te mostraremos 3 caminos diferentes para alcanzarlo.
                    Cada escenario está basado en tu meta mensual real de {formatCurrency(userGoal.monthlyGoal)}.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Scenarios Grid */}
          {scenarios.length > 0 && (
            <>
              <div className="text-center space-y-2 py-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  3 Caminos para alcanzar tu meta
                </h2>
                <p className="text-muted-foreground">
                  Cada escenario te muestra una estrategia diferente. Elige el que mejor se adapte a tu estilo de venta.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {scenarios.map((scenario, index) => (
                  <Card
                    key={index}
                    className={cn(
                      'relative overflow-hidden border-2 transition-all hover:shadow-lg hover:scale-105',
                      index === 0 && 'border-blue-500/50',
                      index === 1 && 'border-primary/50',
                      index === 2 && 'border-secondary/50'
                    )}
                  >
                    {/* Header with gradient */}
                    <div
                      className={cn(
                        'p-6 text-white',
                        scenario.color
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-full">
                          {scenario.icon}
                        </div>
                        <h3 className="text-lg font-bold">{scenario.name}</h3>
                      </div>
                      <p className="text-sm text-white/90">{scenario.description}</p>
                    </div>

                    <CardContent className="space-y-4 pt-6">
                      {/* Bonus Amount - Highlighted */}
                      <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border-2 border-primary/20">
                        <p className="text-sm text-muted-foreground font-medium mb-1">Bono Estimado</p>
                        <p className="text-3xl font-bold text-primary">
                          {formatCurrency(scenario.bonus)}
                        </p>
                      </div>

                      {/* Achievement Level */}
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-sm px-4 py-1">
                          Nivel: {scenario.achievementLevel}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">Colocación</span>
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(scenario.colocacion)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">Meta</span>
                          <span className="text-sm font-bold">
                            {formatCurrency(scenario.meta)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">% Cumplimiento</span>
                          <span className="text-sm font-bold text-secondary">
                            {((scenario.colocacion / scenario.meta) * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Cat.</p>
                            <Badge variant="secondary" className="text-xs">
                              {scenario.category}
                            </Badge>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Calidad</p>
                            <Badge
                              className={cn('text-xs', {
                                'bg-green-500 text-white': scenario.qualityMultiplier === 'A',
                                'bg-blue-500 text-white': scenario.qualityMultiplier === 'B',
                              })}
                            >
                              {scenario.qualityMultiplier}
                            </Badge>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Crec.</p>
                            <Badge
                              className={cn('text-xs', {
                                'bg-green-500 text-white': scenario.growthMultiplier === 'A',
                                'bg-blue-500 text-white': scenario.growthMultiplier === 'B',
                              })}
                            >
                              {scenario.growthMultiplier}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Motivational Card */}
              <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/10 to-primary/10">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <h3 className="text-xl font-bold mb-2">¡Tu éxito está a tu alcance!</h3>
                  <p className="text-muted-foreground">
                    Cada escenario representa un camino viable hacia tu meta. Elige el que mejor se alinee con tus
                    fortalezas y trabaja con determinación. <strong className="text-primary">¡Tú puedes lograrlo!</strong>
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
