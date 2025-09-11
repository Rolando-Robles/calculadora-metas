
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// --- Constants & Defaults ---
const MOCK_DATA = {
    created_mtd: 45,
    disbursed_count_mtd: 15,
    amount_mtd: 580000,
    sustainable_created_per_day: 10,
    costo_operativo_mensual: 25000,
    cac_objetivo: 0.04, // 4%
    cac_tope: 0.06, // 6%
    dr0: 0.06, // 6%
};

const CR_BASE_DEFAULT = 0.35;
const AVG_TICKET_DEFAULT = 12000;
const ALPHA = 0.5; // Quality factor
const BETA = 0.04; // Delinquency factor

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getCacStatus = (cac: number, objetivo: number, tope: number): "success" | "warning" | "danger" => {
    if (cac <= objetivo) return "success";
    if (cac > objetivo && cac <= tope) return "warning";
    return "danger";
}

export default function SimularPage() {
    const [createdSim, setCreatedSim] = useState(MOCK_DATA.created_mtd);
    const [amountNetSim, setAmountNetSim] = useState(MOCK_DATA.amount_mtd);
    const [isUpdating, setIsUpdating] = useState<'requests' | 'amount' | null>(null);
    const [vinculateSliders, setVinculateSliders] = useState(true);

    // --- Base Parameters from "Data Sources" ---
    const baseParams = useMemo(() => {
        const cr_base = MOCK_DATA.created_mtd > 0 ? MOCK_DATA.disbursed_count_mtd / MOCK_DATA.created_mtd : CR_BASE_DEFAULT;
        const avg_ticket = MOCK_DATA.disbursed_count_mtd > 0 ? MOCK_DATA.amount_mtd / MOCK_DATA.disbursed_count_mtd : AVG_TICKET_DEFAULT;
        return {
            cr_base,
            avg_ticket,
            sustainable_created: MOCK_DATA.sustainable_created_per_day * 22, // Assuming 22 work days
            dr0: MOCK_DATA.dr0,
        };
    }, []);

    const calculateMetrics = useCallback((
        requests: number,
        sustainable: number,
        cr_base: number,
        avg_ticket: number,
        dr0: number
    ) => {
        const qualityIndex = requests <= sustainable
            ? 1.0
            : Math.max(0.6, 1 - ALPHA * (requests - sustainable) / sustainable);

        const expectedDelinquency = dr0 + BETA * Math.max(0, requests - sustainable) / sustainable;

        const disbursedCountSim = Math.round(requests * cr_base * qualityIndex);
        const amountGrossSim = disbursedCountSim * avg_ticket;
        const netAmount = amountGrossSim * (1 - expectedDelinquency);

        return { netAmount, disbursedCountSim, qualityIndex, expectedDelinquency };
    }, []);

    // --- Bidirectional Slider Logic ---
    useEffect(() => {
        if (!vinculateSliders) return;

        if (isUpdating === 'requests') {
            const { netAmount } = calculateMetrics(
                createdSim,
                baseParams.sustainable_created,
                baseParams.cr_base,
                baseParams.avg_ticket,
                baseParams.dr0
            );
            setAmountNetSim(Math.max(0, netAmount));
        }
    }, [createdSim, isUpdating, vinculateSliders, baseParams, calculateMetrics]);

    useEffect(() => {
        if (!vinculateSliders) return;

        if (isUpdating === 'amount') {
            // Simplified iterative solution to find created_sim for a given amount_net_sim
            let estimatedRequests = (amountNetSim / baseParams.avg_ticket) / baseParams.cr_base;
            for (let i = 0; i < 5; i++) { // 5 iterations are enough for a good approximation
                const { qualityIndex, expectedDelinquency } = calculateMetrics(
                    estimatedRequests,
                    baseParams.sustainable_created,
                    baseParams.cr_base,
                    baseParams.avg_ticket,
                    baseParams.dr0
                );
                const projectedNet = Math.round(estimatedRequests * baseParams.cr_base * qualityIndex) * baseParams.avg_ticket * (1 - expectedDelinquency);
                const error = amountNetSim - projectedNet;
                if (Math.abs(error) < 1000) break; // Close enough
                estimatedRequests += error / (baseParams.avg_ticket * baseParams.cr_base);
            }
             setCreatedSim(Math.max(0, Math.min(60, Math.round(estimatedRequests))));
        }
    }, [amountNetSim, isUpdating, vinculateSliders, baseParams, calculateMetrics]);


    // --- Real-time Results Calculation ---
    const { projectedDisbursements, projectedQuality, projectedDelinquency, projectedCac, cacStatus, score, league, projectedBonus, nextCacHint, qualityHint } = useMemo(() => {
        const { netAmount, disbursedCountSim, qualityIndex, expectedDelinquency } = calculateMetrics(
            createdSim,
            baseParams.sustainable_created,
            baseParams.cr_base,
            baseParams.avg_ticket,
            baseParams.dr0
        );

        const cac = MOCK_DATA.costo_operativo_mensual / Math.max(1, MOCK_DATA.amount_mtd + netAmount);
        const status = getCacStatus(cac, MOCK_DATA.cac_objetivo, MOCK_DATA.cac_tope);

        // Score & Bonus Logic
        let cacScore = 0;
        if (cac <= MOCK_DATA.cac_objetivo) cacScore = 100;
        else if (cac > MOCK_DATA.cac_objetivo && cac <= MOCK_DATA.cac_tope) cacScore = 60;
        
        const totalScore = 0.8 * cacScore + 0.2 * 60; // 60 is the fixed score part
        
        let currentLeague = 'Sin Liga';
        let bonus = 0;
        if (totalScore >= 80) { currentLeague = 'Liga 2×'; bonus = 5000; }
        else if (totalScore >= 60) { currentLeague = 'Liga 1×'; bonus = 2500; }
        else if (totalScore >= 45) { currentLeague = 'Liga 0.5×'; bonus = 1000; }

        // Hints
        const amountForObjectiveCac = (MOCK_DATA.costo_operativo_mensual / MOCK_DATA.cac_objetivo) - MOCK_DATA.amount_mtd;
        const nextHint = cac < MOCK_DATA.cac_objetivo ? '¡CAC objetivo alcanzado!' : `Faltan ${formatCurrency(Math.max(0, amountForObjectiveCac - netAmount))} en monto neto para llegar a CAC objetivo.`;

        const qHint = createdSim > baseParams.sustainable_created ? `Reducir solicitudes a ${baseParams.sustainable_created} para mejorar calidad (Q=1.0).` : 'Nivel de solicitudes sostenible.';


        return {
            projectedDisbursements: { count: disbursedCountSim, amount: netAmount },
            projectedQuality: qualityIndex,
            projectedDelinquency: expectedDelinquency,
            projectedCac: cac,
            cacStatus: status,
            score: totalScore,
            league: currentLeague,
            projectedBonus: bonus,
            nextCacHint: nextHint,
            qualityHint: qHint
        };

    }, [createdSim, baseParams]);

    const handleRequestsChange = (value: number[]) => {
        setIsUpdating('requests');
        setCreatedSim(value[0]);
    };

    const handleAmountChange = (value: number[]) => {
        setIsUpdating('amount');
        setAmountNetSim(value[0]);
    };
    
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 flex h-auto items-center border-b bg-background/80 p-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:py-4">
        <div className="flex flex-col">
          <h1 className="text-headline-lg font-bold">Simulador: Volumen ↔ Ventas</h1>
           <p className="text-sm text-muted-foreground mt-1">
             Solicitudes no pagan variable, pero influyen en desembolsos y calidad.
           </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
               <div className="flex justify-between items-center">
                    <CardTitle>¿Qué pasa si...?</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Switch id="vinculate-sliders" checked={vinculateSliders} onCheckedChange={setVinculateSliders} />
                        <Label htmlFor="vinculate-sliders" className="text-sm font-normal">Vincular sliders</Label>
                    </div>
               </div>
              <CardDescription className="text-body-lg pt-1">
                Ajusta las variables para proyectar tus resultados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                    <label htmlFor="requests-slider" className="text-base font-medium">
                        Solicitudes creadas <span className="text-xs text-muted-foreground">(impactan calidad)</span>
                    </label>
                    <span className="text-xl font-bold font-headline">{createdSim}</span>
                </div>
                <Slider
                  id="requests-slider"
                  value={[createdSim]}
                  onValueChange={handleRequestsChange}
                  onPointerUp={() => setIsUpdating(null)}
                  max={60}
                  step={1}
                  className="h-6"
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                    <label htmlFor="amount-slider" className="text-base font-medium">
                        Monto Desembolsado <span className="text-xs text-muted-foreground">(neto de riesgo)</span>
                    </label>
                    <span className="text-xl font-bold font-headline">{formatCurrency(amountNetSim)}</span>
                </div>
                <Slider
                  id="amount-slider"
                  value={[amountNetSim]}
                  onValueChange={handleAmountChange}
                  onPointerUp={() => setIsUpdating(null)}
                  max={2000000}
                  step={10000}
                  className="h-6"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
                <CardHeader>
                    <CardTitle>Resultados Proyectados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-body-lg">
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Desembolsos</span>
                       <span className="font-semibold">{projectedDisbursements.count}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Monto Neto</span>
                       <span className="font-semibold">{formatCurrency(projectedDisbursements.amount)}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Calidad (Q)</span>
                       <span className="font-semibold">{projectedQuality.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Morosidad Esperada</span>
                       <span className="font-semibold">{(projectedDelinquency * 100).toFixed(1)}%</span>
                   </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Impacto en Incentivos</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4 text-body-lg">
                    <div className="flex justify-between items-center">
                       <span className="text-muted-foreground">CAC Proyectado</span>
                       <Badge variant={cacStatus === 'success' ? 'default' : cacStatus === 'warning' ? 'secondary' : 'destructive'}
                         className={cn(
                            {'bg-accent text-accent-foreground': cacStatus === 'success'},
                            {'bg-yellow-400 text-black': cacStatus === 'warning'},
                            {'bg-destructive text-destructive-foreground': cacStatus === 'danger'}
                         )}
                       >
                         {(projectedCac * 100).toFixed(2)}%
                       </Badge>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Puntaje (CAC 80%)</span>
                       <span className="font-semibold">{score.toFixed(0)} pts</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Liga</span>
                       <span className="font-semibold">{league}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Bono Proyectado</span>
                       <span className="font-semibold text-primary">{formatCurrency(projectedBonus)}</span>
                   </div>
                </CardContent>
            </Card>
          </div>

           <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg">Sugerencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• {nextCacHint}</p>
                    <p>• {qualityHint}</p>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}
