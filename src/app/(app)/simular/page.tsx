'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function SimularPage() {
  const [requests, setRequests] = useState(15);
  const [amount, setAmount] = useState(250000);

  const calculateCommission = (reqs: number, amt: number) => {
    let baseCommission = amt * 0.02; // 2% base
    let multiplier = 1;

    if (reqs >= 20 && amt >= 300000) {
      multiplier = 1.05;
    }
    if (reqs >= 40 && amt >= 700000) {
      multiplier = 1.1;
    }
    if (reqs >= 55 && amt >= 1200000) {
        multiplier = 1.15;
    }

    const projectedCommission = baseCommission * multiplier;

    let nextLevelHint = '';
    if (multiplier < 1.05) {
      nextLevelHint = `Faltan ${Math.max(0, 20-reqs)} desembolsos y ${formatCurrency(Math.max(0, 300000-amt))} para el nivel 1.05×`;
    } else if (multiplier < 1.1) {
      nextLevelHint = `Faltan ${Math.max(0, 40-reqs)} desembolsos y ${formatCurrency(Math.max(0, 700000-amt))} para el nivel 1.10×`;
    } else if (multiplier < 1.15) {
        nextLevelHint = `Faltan ${Math.max(0, 55-reqs)} desembolsos y ${formatCurrency(Math.max(0, 1200000-amt))} para el nivel 1.15×`;
    } else {
        nextLevelHint = '¡Has alcanzado el máximo multiplicador!';
    }


    return { projectedCommission, multiplier, nextLevelHint };
  };

  const { projectedCommission, multiplier, nextLevelHint } = calculateCommission(requests, amount);

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:pt-4">
        <h1 className="text-3xl font-headline font-bold">Simulador de Incentivos</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>¿Qué pasa si...?</CardTitle>
              <CardDescription>
                Usa los deslizadores para proyectar tu comisión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-2">
                    <label htmlFor="requests-slider" className="text-sm font-medium">
                        Solicitudes Creadas
                    </label>
                    <span className="text-lg font-bold font-headline">{requests}</span>
                </div>
                <Slider
                  id="requests-slider"
                  value={[requests]}
                  onValueChange={(value) => setRequests(value[0])}
                  max={60}
                  step={1}
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                    <label htmlFor="amount-slider" className="text-sm font-medium">
                        Monto Desembolsado
                    </label>
                    <span className="text-lg font-bold font-headline">{formatCurrency(amount)}</span>
                </div>
                <Slider
                  id="amount-slider"
                  value={[amount]}
                  onValueChange={(value) => setAmount(value[0])}
                  max={2000000}
                  step={10000}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Resultados en Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-background">
                <span className="text-muted-foreground">Comisión Proyectada</span>
                <span className="text-2xl font-bold text-primary font-headline">
                  {formatCurrency(projectedCommission)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-background">
                <span className="text-muted-foreground">Multiplicador Alcanzado</span>
                <span className="text-2xl font-bold text-accent font-headline">{multiplier}×</span>
              </div>
              <div className="text-center text-sm text-muted-foreground p-2">
                <p>{nextLevelHint}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                Guardar como plan del día
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
