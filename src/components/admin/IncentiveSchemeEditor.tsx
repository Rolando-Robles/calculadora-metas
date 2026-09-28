'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getIncentiveConfig,
  resetIncentiveConfigToDefaults,
  updateIncentiveConfig,
} from '@/lib/firestore-service';
import type {
  GoalAchievementConfig,
  GrowthMultiplierConfig,
  QualityMultiplierConfig,
} from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import {
  GOAL_ACHIEVEMENT_LEVELS,
  GROWTH_MULTIPLIERS,
  QUALITY_MULTIPLIERS,
  RENEWAL_MULTIPLIERS,
} from '@/lib/incentives-config';

interface SchemeState {
  goalLevels: GoalAchievementConfig[];
  qualityMults: QualityMultiplierConfig[];
  growthMults: GrowthMultiplierConfig[];
  renewalMults: GrowthMultiplierConfig[];
}

/** Fila vacía que el equipo usa como separador visual; no afecta el cálculo. */
const isPlaceholderLevel = (l: GoalAchievementConfig) =>
  !l.label.trim() && l.minPercentage === 0 && (l.maxPercentage === 0 || l.maxPercentage === null);

/** Advertencias (no bloquean el guardado) sobre rangos que el cálculo interpretaría raro. */
function validateLevels(levels: GoalAchievementConfig[]): string[] {
  const warnings: string[] = [];
  const active = levels.filter(l => !isPlaceholderLevel(l));
  active.forEach(l => {
    const name = l.label || 'Nivel sin nombre';
    if (l.maxPercentage !== null && l.maxPercentage <= l.minPercentage) {
      warnings.push(`${name}: el máximo (${l.maxPercentage}%) debe ser mayor que el mínimo (${l.minPercentage}%).`);
    }
  });
  const openEnded = active.filter(l => l.maxPercentage === null);
  if (openEnded.length > 1) {
    warnings.push(`Hay ${openEnded.length} niveles sin máximo (∞); solo el último debería tenerlo.`);
  }
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const aMax = a.maxPercentage ?? Infinity;
      const bMax = b.maxPercentage ?? Infinity;
      if (a.minPercentage < bMax && b.minPercentage < aMax) {
        warnings.push(
          `${a.label || 'Sin nombre'} y ${b.label || 'Sin nombre'} se enciman; el cálculo usará el que aparece primero.`
        );
      }
    }
  }
  return warnings;
}

export function IncentiveSchemeEditor({
  actor,
  onDirtyChange,
}: {
  actor: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState<SchemeState | null>(null);
  const [state, setState] = useState<SchemeState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getIncentiveConfig();
      const next: SchemeState = {
        goalLevels: config.goalAchievementLevels || GOAL_ACHIEVEMENT_LEVELS,
        qualityMults: config.qualityMultipliers || QUALITY_MULTIPLIERS,
        growthMults: config.growthMultipliers || GROWTH_MULTIPLIERS,
        renewalMults: config.renewalMultipliers || RENEWAL_MULTIPLIERS,
      };
      setSaved(next);
      setState(next);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast({ title: 'Error', description: 'No se pudo cargar el esquema de incentivos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(state), [saved, state]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const warnings = useMemo(() => (state ? validateLevels(state.goalLevels) : []), [state]);

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando esquema…
      </div>
    );
  }

  const update = (patch: Partial<SchemeState>) => setState(prev => (prev ? { ...prev, ...patch } : prev));

  const updateLevel = (index: number, patch: Partial<GoalAchievementConfig>) => {
    const goalLevels = [...state.goalLevels];
    goalLevels[index] = { ...goalLevels[index], ...patch };
    update({ goalLevels });
  };

  const insertLevel = (afterIndex: number) => {
    const goalLevels = [...state.goalLevels];
    goalLevels.splice(afterIndex + 1, 0, {
      level: `nivel_${Date.now()}`,
      minPercentage: 0,
      maxPercentage: 0,
      label: '',
      bonusPercentages: { G0: 0, G1: 0, G2: 0, G3: 0, G4: 0 },
    });
    update({ goalLevels });
  };

  const removeLevel = (index: number) => {
    update({ goalLevels: state.goalLevels.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateIncentiveConfig(
        {
          goalAchievementLevels: state.goalLevels,
          qualityMultipliers: state.qualityMults,
          growthMultipliers: state.growthMults,
          renewalMultipliers: state.renewalMults,
        },
        actor
      );
      setSaved(state);
      toast({ title: 'Esquema guardado', description: 'Los vendedores verán los nuevos valores al recargar.' });
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast({ title: 'Error', description: 'No se pudo guardar el esquema', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    setSaving(true);
    try {
      await resetIncentiveConfigToDefaults(actor);
      await load();
      toast({ title: 'Valores por defecto restaurados' });
    } catch (error) {
      console.error('Error restaurando configuración:', error);
      toast({ title: 'Error', description: 'No se pudieron restaurar los valores', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const multiplierList = (
    items: GrowthMultiplierConfig[] | QualityMultiplierConfig[],
    prefix: string,
    onChange: (index: number, value: number) => void
  ) => (
    <div className="space-y-3">
      {items.map((mult, index) => (
        <div key={mult.level} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-semibold">
              {prefix} {mult.level}
            </p>
            <p className="text-sm text-muted-foreground">{mult.label}</p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor={`${prefix}-${mult.level}`}>Multiplicador</Label>
            <Input
              id={`${prefix}-${mult.level}`}
              type="number"
              step="0.01"
              value={mult.value}
              onChange={e => onChange(index, Number(e.target.value))}
              className="w-24"
            />
            <Badge>×{Number(mult.value).toFixed(2)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );

  const setMult = <T extends { value: number }>(list: T[], index: number, value: number): T[] =>
    list.map((m, i) => (i === index ? { ...m, value } : m));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Aplica a todos los vendedores en cuanto se guarda.
          {dirty && <span className="ml-2 font-medium text-amber-600">Tienes cambios sin guardar.</span>}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={saving} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Restaurar valores por defecto
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setState(saved)} disabled={saving}>
              Descartar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar esquema
          </Button>
        </div>
      </div>

      <Tabs defaultValue="levels">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="levels">Niveles</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
          <TabsTrigger value="growth">Crecimiento</TabsTrigger>
          <TabsTrigger value="renewal">Renovaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Porcentajes de bono base por nivel y categoría</CardTitle>
              <CardDescription>
                El nivel se elige por % de cumplimiento: mínimo incluido, máximo excluido. Deja el máximo vacío para
                &quot;en adelante&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {warnings.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  {warnings.map(w => (
                    <p key={w} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Min %</TableHead>
                      <TableHead>Max %</TableHead>
                      {CATEGORIES.map(cat => (
                        <TableHead key={cat.value}>{cat.label} (%)</TableHead>
                      ))}
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.goalLevels.map((level, index) => (
                      <TableRow key={level.level}>
                        <TableCell>
                          <Input
                            value={level.label}
                            onChange={e => updateLevel(index, { label: e.target.value })}
                            placeholder="Sin nombre"
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={level.minPercentage}
                            onChange={e => updateLevel(index, { minPercentage: Number(e.target.value) })}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={level.maxPercentage ?? ''}
                            onChange={e =>
                              updateLevel(index, {
                                maxPercentage: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-20"
                            placeholder="∞"
                          />
                        </TableCell>
                        {CATEGORIES.map(cat => (
                          <TableCell key={cat.value}>
                            <Input
                              type="number"
                              step="0.1"
                              value={level.bonusPercentages[cat.value]}
                              onChange={e =>
                                updateLevel(index, {
                                  bonusPercentages: { ...level.bonusPercentages, [cat.value]: Number(e.target.value) },
                                })
                              }
                              className="w-20"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Insertar nivel después de esta fila"
                              onClick={() => insertLevel(index)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Eliminar este nivel"
                              onClick={() => removeLevel(index)}
                              disabled={state.goalLevels.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicadores de calidad</CardTitle>
              <CardDescription>La mejor originación se traduce en la mejor cobranza</CardDescription>
            </CardHeader>
            <CardContent>
              {multiplierList(state.qualityMults, 'Calidad', (i, v) =>
                update({ qualityMults: setMult(state.qualityMults, i, v) })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicadores de crecimiento</CardTitle>
              <CardDescription>
                El servicio y lealtad del cliente se reflejan en renovaciones y crecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {multiplierList(state.growthMults, 'Crecimiento', (i, v) =>
                update({ growthMults: setMult(state.growthMults, i, v) })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicadores de renovaciones</CardTitle>
              <CardDescription>
                Para Nano, ATN y Cashi: reconoce lograr que clientes satisfechos vuelvan a solicitar crédito
              </CardDescription>
            </CardHeader>
            <CardContent>
              {multiplierList(state.renewalMults, 'Renovación', (i, v) =>
                update({ renewalMults: setMult(state.renewalMults, i, v) })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar valores por defecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazan niveles y multiplicadores guardados por los valores originales del sistema. Afecta de
              inmediato el cálculo de todos los vendedores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
