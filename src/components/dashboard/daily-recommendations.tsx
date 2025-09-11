'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDailyRecommendations } from '@/lib/actions';

export function DailyRecommendations() {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      // Mock inputs for demonstration
      const performanceData = 'Desembolsó 1 de 3 créditos esperados para hoy.';
      const goals = 'Meta mensual de $900,000 MXN. Faltan $320,000.';
      const incentiveScheme = 'Bono de 1.05x al alcanzar 20 desembolsos. Lleva 18.';

      const result = await getDailyRecommendations(performanceData, goals, incentiveScheme);
      setRecommendations(result);
      setLoading(false);
    }

    fetchRecommendations();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lightbulb className="h-6 w-6 text-yellow-400" />
          <span>Qué hacer hoy</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        ) : (
          <ul className="space-y-3 text-body-lg">
            {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 block h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                  <span>{rec}</span>
                </li>
              ))
            ) : (
                <p className="text-muted-foreground">No hay recomendaciones por ahora.</p>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
