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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateFinalBonus, GOAL_ACHIEVEMENT_LEVELS } from '@/lib/incentives-config';
import type {
  UserCategory,
  QualityMultiplier,
  GrowthMultiplier,
} from '@/lib/types';
import { Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [targetBonus, setTargetBonus] = useState<number>(50000);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const generateScenarios = () => {
    const newScenarios: Scenario[] = [];

    // Scenario 1: Conservative - Higher colocación, basic multipliers
    const conservative = generateScenario(
      targetBonus,
      'G4' as UserCategory,
      'B' as QualityMultiplier,
      'B' as GrowthMultiplier,
      1.0
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
      'G4' as UserCategory,
      'A' as QualityMultiplier,
      'B' as GrowthMultiplier,
      0.85
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
      'G4' as UserCategory,
      'A' as QualityMultiplier,
      'A' as GrowthMultiplier,
      0.73
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
    multiplier: number
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

    // Set meta to make this an "Elite" achievement (colocación should be 150%+ of meta)
    const meta = Math.floor(estimatedColocacion / 1.6); // Will give ~160% achievement
    const roundedMeta = Math.ceil(meta / 10000) * 10000;

    // Calculate actual bonus
    const calculation = calculateFinalBonus(
      estimatedColocacion,
      roundedMeta,
      category,
      quality,
      growth
    );

    const achievementPercentage = (estimatedColocacion / roundedMeta) * 100;
    const level = GOAL_ACHIEVEMENT_LEVELS.find(l => {
      if (l.maxPercentage === null) {
        return achievementPercentage >= l.minPercentage;
      }
      return achievementPercentage >= l.minPercentage && achievementPercentage < l.maxPercentage;
    });

    return {
      colocacion: estimatedColocacion,
      meta: roundedMeta,
      category,
      qualityMultiplier: quality,
      growthMultiplier: growth,
      bonus: calculation.bonusFinal,
      achievementLevel: level?.label || 'N/A',
    };
  };

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
          {/* Target Input Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Define tu Meta de Ingresos
              </CardTitle>
              <CardDescription>
                Ingresa el bono mensual que deseas alcanzar y te mostraremos 3 escenarios diferentes para lograrlo
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
                Cada escenario tiene diferentes combinaciones de colocación, calidad y crecimiento.
              </AlertDescription>
            </Alert>
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
