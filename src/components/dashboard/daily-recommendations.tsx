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
      // Mock inputs as requested
      const performanceData = 'Desembolsó 1 de 3 créditos esperados para hoy.';
      const goals = 'Meta mensual de $900,000 MXN.';
      const incentiveScheme = 'Bono de 1.05x al alcanzar 45 desembolsos.';

      const result = await getDailyRecommendations(performanceData, goals, incentiveScheme);
      setRecommendations(result);
      setLoading(false);
    }

    fetchRecommendations();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          <span>Qué hacer hoy</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-4/6" />
          </div>
        ) : (
          <ul className="space-y-3 text-sm">
            {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-1 block h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
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
