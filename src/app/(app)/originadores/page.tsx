'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGoals } from '@/lib/firestore-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  calculateFinalBonus,
  GOAL_ACHIEVEMENT_LEVELS,
  QUALITY_MULTIPLIERS,
  GROWTH_MULTIPLIERS,
} from '@/lib/incentives-config';
import type { UserCategory, QualityMultiplier, GrowthMultiplier } from '@/lib/types';
import { Sparkles, TrendingUp, Award, Target } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function OriginadoresPage() {
  const { userProfile } = useAuth();
  const [loadingUserGoal, setLoadingUserGoal] = useState(true);

  const [colocacion, setColocacion] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calculadora-colocacion');
      return saved ? Number(saved) : 300000;
    }
    return 300000;
  });

  const [meta, setMeta] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calculadora-meta');
      return saved ? Number(saved) : 300000;
    }
    return 300000;
  });

  const [category, setCategory] = useState<UserCategory>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calculadora-category');
      return (saved as UserCategory) || 'G4';
    }
    return 'G4';
  });

  const [qualityMultiplier, setQualityMultiplier] = useState<QualityMultiplier>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calculadora-quality');
      return (saved as QualityMultiplier) || 'A';
    }
    return 'A';
  });

  const [growthMultiplier, setGrowthMultiplier] = useState<GrowthMultiplier>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calculadora-growth');
      return (saved as GrowthMultiplier) || 'A';
    }
    return 'A';
  });

  // Cargar la meta del usuario desde Firestore al iniciar
  useEffect(() => {
    async function loadUserGoal() {
      if (!userProfile?.uid) {
        setLoadingUserGoal(false);
        return;
      }

      try {
        const currentPeriod = new Date().toISOString().slice(0, 7);
        const userGoals = await getUserGoals(userProfile.uid);
        const currentGoal = userGoals.find(g => g.period === currentPeriod);

        if (currentGoal) {
          // Si hay una meta en Firestore, usarla
          setMeta(currentGoal.monthlyGoal);
          if (currentGoal.category) {
            setCategory(currentGoal.category);
          }
        } else if (userProfile.category) {
          // Si no hay meta pero el usuario tiene categoría, usarla
          setCategory(userProfile.category as UserCategory);
        }
      } catch (error) {
        console.error('Error cargando meta del usuario:', error);
      } finally {
        setLoadingUserGoal(false);
      }
    }

    loadUserGoal();
  }, [userProfile]);

  // Guardar en localStorage cuando cambien los valores
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculadora-colocacion', String(colocacion));
    }
  }, [colocacion]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculadora-meta', String(meta));
    }
  }, [meta]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculadora-category', category);
    }
  }, [category]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculadora-quality', qualityMultiplier);
    }
  }, [qualityMultiplier]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calculadora-growth', growthMultiplier);
    }
  }, [growthMultiplier]);

  const calculation = useMemo(() => {
    return calculateFinalBonus(colocacion, meta, category, qualityMultiplier, growthMultiplier);
  }, [colocacion, meta, category, qualityMultiplier, growthMultiplier]);

  const achievementLevelConfig = GOAL_ACHIEVEMENT_LEVELS.find(
    l => l.level === calculation.achievementLevel
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'fuera_de_juego':
        return 'bg-red-500';
      case 'en_juego':
        return 'bg-yellow-500';
      case 'cumplido':
        return 'bg-blue-500';
      case 'dominado':
        return 'bg-purple-500';
      case 'sobresaliente':
        return 'bg-orange-500';
      case 'elite':
        return 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Originadores de Excelencia</h1>
            <p className="text-sm text-white/90">
              Calcula tus incentivos basados en tu desempeño
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Formula Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                La fórmula clave que te conducirá al éxito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-lg font-semibold text-foreground">
                  Bono Final = Colocación × % Bono Base × Multiplicador Calidad × Multiplicador
                  Crecimiento
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Configuración
                  </CardTitle>
                  <CardDescription>Define tus parámetros de venta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Colocación */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label htmlFor="colocacion" className="text-base font-medium">
                        Colocación (Monto colocado)
                      </Label>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(colocacion)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="colocacion"
                        type="number"
                        value={colocacion}
                        onChange={e => setColocacion(Number(e.target.value) || 0)}
                        className="text-lg flex-1"
                        step={10000}
                        placeholder="Ingresa el monto"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setColocacion(Math.max(0, colocacion - 50000))}
                          className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          title="Restar 50k"
                        >
                          -50k
                        </button>
                        <button
                          type="button"
                          onClick={() => setColocacion(colocacion + 50000)}
                          className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          title="Sumar 50k"
                        >
                          +50k
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[colocacion]}
                      onValueChange={v => setColocacion(v[0])}
                      max={1000000}
                      step={10000}
                      className="h-6"
                    />
                  </div>

                  {/* Meta */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label htmlFor="meta" className="text-base font-medium">
                        Meta Mensual
                      </Label>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(meta)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="meta"
                        type="number"
                        value={meta}
                        onChange={e => setMeta(Number(e.target.value) || 0)}
                        className="text-lg flex-1"
                        step={10000}
                        placeholder="Ingresa tu meta"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setMeta(Math.max(0, meta - 50000))}
                          className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          title="Restar 50k"
                        >
                          -50k
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeta(meta + 50000)}
                          className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          title="Sumar 50k"
                        >
                          +50k
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[meta]}
                      onValueChange={v => setMeta(v[0])}
                      max={1000000}
                      step={10000}
                      className="h-6"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={category} onValueChange={v => setCategory(v as UserCategory)}>
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

                  {/* Quality Multiplier */}
                  <div className="space-y-2">
                    <Label htmlFor="quality">Multiplicador de Calidad</Label>
                    <Select
                      value={qualityMultiplier}
                      onValueChange={v => setQualityMultiplier(v as QualityMultiplier)}
                    >
                      <SelectTrigger id="quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_MULTIPLIERS.map(q => (
                          <SelectItem key={q.level} value={q.level}>
                            {q.label} (×{q.value.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Growth Multiplier */}
                  <div className="space-y-2">
                    <Label htmlFor="growth">Multiplicador de Crecimiento</Label>
                    <Select
                      value={growthMultiplier}
                      onValueChange={v => setGrowthMultiplier(v as GrowthMultiplier)}
                    >
                      <SelectTrigger id="growth">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROWTH_MULTIPLIERS.map(g => (
                          <SelectItem key={g.level} value={g.level}>
                            {g.label} (×{g.value.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="space-y-6">
              {/* Achievement Status */}
              <Card className="border-2" style={{ borderColor: `hsl(var(--primary))` }}>
                <CardHeader>
                  <CardTitle>Estado de Cumplimiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Porcentaje de Meta</span>
                    <span className="text-2xl font-bold">
                      {formatPercentage(calculation.achievementPercentage)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nivel</span>
                    <Badge
                      className={cn(
                        'text-white text-sm px-3 py-1',
                        getLevelColor(calculation.achievementLevel)
                      )}
                    >
                      {achievementLevelConfig?.label || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">% Bono Base</span>
                    <span className="text-xl font-semibold text-primary">
                      {calculation.bonusBasePercentage.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Calculation Breakdown */}
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Desglose del Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-muted-foreground">Bono Base</span>
                    <span className="font-semibold">{formatCurrency(calculation.bonusBase)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-muted-foreground">× Calidad</span>
                    <span className="font-semibold">
                      ×{calculation.qualityMultiplierValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-muted-foreground">× Crecimiento</span>
                    <span className="font-semibold">
                      ×{calculation.growthMultiplierValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-primary to-secondary" />
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary to-secondary rounded-lg text-white">
                    <span className="text-lg font-bold">Bono Final</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(calculation.bonusFinal)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Example Display */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">
                    {calculation.bonusFinal > 0 ? '✅ Ganador' : '❌ Sin Ganancia'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {calculation.bonusFinal > 0
                      ? 'Este nivel sí justifica el desempeño extraordinario.'
                      : 'El bono no se pierde por vender poco, se pierde por vender mal.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tables Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tablas de Referencia</CardTitle>
              <CardDescription>
                Consulta los porcentajes de bono según tu cumplimiento y multiplicadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bonus" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bonus">% Bono Base</TabsTrigger>
                  <TabsTrigger value="quality">Calidad</TabsTrigger>
                  <TabsTrigger value="growth">Crecimiento</TabsTrigger>
                </TabsList>

                <TabsContent value="bonus" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left font-medium">Cumplimiento Meta</th>
                          <th className="p-2 text-left font-medium">Nivel</th>
                          <th className="p-2 text-center font-medium">G1</th>
                          <th className="p-2 text-center font-medium">G2</th>
                          <th className="p-2 text-center font-medium">G3</th>
                          <th className="p-2 text-center font-medium">G4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {GOAL_ACHIEVEMENT_LEVELS.map(level => (
                          <tr key={level.level} className="border-b hover:bg-muted/30">
                            <td className="p-2">
                              {level.maxPercentage
                                ? `${level.minPercentage}% - ${level.maxPercentage}%`
                                : `≥${level.minPercentage}%`}
                            </td>
                            <td className="p-2">
                              <Badge
                                variant="outline"
                                className={cn('text-xs', {
                                  'bg-primary/10 text-primary border-primary':
                                    level.level === calculation.achievementLevel,
                                })}
                              >
                                {level.label}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">{level.bonusPercentages.G1}%</td>
                            <td className="p-2 text-center">{level.bonusPercentages.G2}%</td>
                            <td className="p-2 text-center">{level.bonusPercentages.G3}%</td>
                            <td className="p-2 text-center">{level.bonusPercentages.G4}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="quality" className="mt-4">
                  <div className="grid gap-3">
                    {QUALITY_MULTIPLIERS.map(q => (
                      <div
                        key={q.level}
                        className={cn(
                          'flex justify-between items-center p-4 rounded-lg border-2 transition-all',
                          qualityMultiplier === q.level
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card'
                        )}
                      >
                        <div>
                          <p className="font-semibold">Calidad {q.level}</p>
                          <p className="text-sm text-muted-foreground">{q.label}</p>
                        </div>
                        <Badge
                          variant={qualityMultiplier === q.level ? 'default' : 'outline'}
                          className="text-lg px-4 py-1"
                        >
                          ×{q.value.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                    La mejor originación se traduce en la mejor cobranza.
                  </p>
                </TabsContent>

                <TabsContent value="growth" className="mt-4">
                  <div className="grid gap-3">
                    {GROWTH_MULTIPLIERS.map(g => (
                      <div
                        key={g.level}
                        className={cn(
                          'flex justify-between items-center p-4 rounded-lg border-2 transition-all',
                          growthMultiplier === g.level
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card'
                        )}
                      >
                        <div>
                          <p className="font-semibold">Crecimiento {g.level}</p>
                          <p className="text-sm text-muted-foreground">{g.label}</p>
                        </div>
                        <Badge
                          variant={growthMultiplier === g.level ? 'default' : 'outline'}
                          className="text-lg px-4 py-1"
                        >
                          ×{g.value.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                    Un excelente servicio y la lealtad del cliente se reflejan en las renovaciones y
                    en el crecimiento de tu portafolio.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
