'use client';

import { useState, useMemo } from 'react';
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

const getMotivationalMessage = (
  bonusFinal: number,
  achievementPercentage: number,
  qualityMultiplier: QualityMultiplier,
  growthMultiplier: GrowthMultiplier
) => {
  const hasWinning = bonusFinal > 0;
  const lowQuality = qualityMultiplier === 'C' || qualityMultiplier === 'D';
  const lowGrowth = growthMultiplier === 'C' || growthMultiplier === 'D';
  const lowSales = achievementPercentage < 100;

  if (hasWinning) {
    if (achievementPercentage >= 200) {
      return {
        title: '🏆 ¡Elite Extraordinario!',
        message: '¡Estás dominando el juego! Tu desempeño supera todas las expectativas. Sigue así y alcanzarás la grandeza.',
      };
    } else if (achievementPercentage >= 150) {
      return {
        title: '🌟 ¡Sobresaliente!',
        message: '¡Excelente trabajo! Estás muy por encima de tu meta. Tu dedicación está dando frutos increíbles.',
      };
    } else if (achievementPercentage >= 120) {
      return {
        title: '💪 ¡Dominado!',
        message: '¡Muy bien! Has superado tu meta con creces. Continúa con este impulso ganador.',
      };
    } else if (achievementPercentage >= 100) {
      return {
        title: '✅ ¡Cumplido!',
        message: 'Has alcanzado tu meta. Buen trabajo. Ahora apunta más alto para alcanzar el siguiente nivel.',
      };
    } else {
      return {
        title: '🎯 En Juego',
        message: 'Estás en camino. Sigue esforzándote para alcanzar tu meta y maximizar tu bono.',
      };
    }
  } else {
    // No hay ganancia - mensajes específicos según qué está fallando
    if (lowQuality && lowGrowth && lowSales) {
      return {
        title: '⚠️ Atención Requerida',
        message: 'Necesitas mejorar en todos los aspectos: aumenta tu colocación, mejora la calidad de tus créditos y trabaja en el crecimiento de tu cartera. ¡Tú puedes lograrlo!',
      };
    } else if (lowQuality && lowGrowth) {
      return {
        title: '📊 Mejora Calidad y Crecimiento',
        message: 'Tu colocación está bien, pero necesitas mejorar la calidad de tus créditos y el crecimiento de tu cartera para obtener mejores bonos.',
      };
    } else if (lowQuality && lowSales) {
      return {
        title: '🎯 Aumenta Ventas y Calidad',
        message: 'Concéntrate en alcanzar tu meta de colocación y asegúrate de que cada crédito sea de la más alta calidad.',
      };
    } else if (lowGrowth && lowSales) {
      return {
        title: '📈 Impulsa Ventas y Cartera',
        message: 'Necesitas incrementar tu colocación y trabajar en el crecimiento de tu cartera. Enfócate en renovaciones y lealtad de clientes.',
      };
    } else if (lowQuality) {
      return {
        title: '⭐ Mejora la Calidad',
        message: 'El bono no se pierde por vender poco, se pierde por vender mal. La mejor originación se traduce en la mejor cobranza.',
      };
    } else if (lowGrowth) {
      return {
        title: '🌱 Impulsa el Crecimiento',
        message: 'Tu calidad es buena, pero necesitas trabajar en el crecimiento de tu cartera. Enfócate en renovaciones y en la lealtad del cliente.',
      };
    } else if (lowSales) {
      return {
        title: '🚀 Acelera las Ventas',
        message: 'Tu calidad y crecimiento están bien, pero necesitas aumentar tu colocación para alcanzar tu meta. ¡Dale un empujón final!',
      };
    } else {
      return {
        title: '💡 Revisa tus Números',
        message: 'Aunque tus indicadores parecen buenos, tu bono es cero. Verifica que todos los multiplicadores estén configurados correctamente.',
      };
    }
  }
};

export default function OriginadoresPage() {
  const [colocacion, setColocacion] = useState(300000);
  const [meta, setMeta] = useState(300000);
  const [category, setCategory] = useState<UserCategory>('G4');
  const [qualityMultiplier, setQualityMultiplier] = useState<QualityMultiplier>('A');
  const [growthMultiplier, setGrowthMultiplier] = useState<GrowthMultiplier>('A');

  const calculation = useMemo(() => {
    return calculateFinalBonus(colocacion, meta, category, qualityMultiplier, growthMultiplier);
  }, [colocacion, meta, category, qualityMultiplier, growthMultiplier]);

  const motivationalMessage = useMemo(() => {
    return getMotivationalMessage(
      calculation.bonusFinal,
      calculation.achievementPercentage,
      qualityMultiplier,
      growthMultiplier
    );
  }, [calculation.bonusFinal, calculation.achievementPercentage, qualityMultiplier, growthMultiplier]);

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
                    <Input
                      id="colocacion"
                      type="number"
                      value={colocacion}
                      onChange={e => setColocacion(Number(e.target.value))}
                      className="text-lg"
                      step={10000}
                    />
                    <Slider
                      value={[colocacion]}
                      onValueChange={v => setColocacion(v[0])}
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

              {/* Motivational Message */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">{motivationalMessage.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{motivationalMessage.message}</p>
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
