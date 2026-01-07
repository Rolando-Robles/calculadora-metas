'use server';

import { z } from 'zod';
import { generateDailyRecommendations as generateDailyRecommendationsFlow } from '@/ai/flows/generate-daily-recommendations';

const dailyCaptureSchema = z.object({
  date: z.string(),
  created: z.string(),
  approved: z.string(),
  disbursed: z.string(),
  amount: z.string(),
});

export async function saveDailyCapture(prevState: { message: string }, formData: FormData) {
  try {
    const rawData = {
      date: formData.get('date'),
      created: formData.get('created'),
      approved: formData.get('approved'),
      disbursed: formData.get('disbursed'),
      amount: formData.get('amount'),
    };

    const validatedData = dailyCaptureSchema.parse(rawData);

    // Here you would typically save to a database
    // For now, we'll just simulate success
    console.log('Guardando captura diaria:', validatedData);

    return {
      message: `Captura guardada exitosamente para ${validatedData.date}`,
    };
  } catch (error) {
    console.error('Error al guardar captura:', error);
    return {
      message: 'Error al guardar la captura. Por favor, verifica los datos.',
    };
  }
}

export async function getDailyRecommendations(
  recentPerformanceData: string,
  goals: string,
  incentiveScheme: string
) {
  try {
    const result = await generateDailyRecommendationsFlow({
      recentPerformanceData,
      goals,
      incentiveScheme,
    });

    // Split recommendations into a list of strings and clean them up.
    // Ensure verbs are short and impactful as per spec.
    const recommendations = result.recommendations
      .split('\n')
      .map(r => r.replace(/^(•|-|\*)\s*/, '').trim()) // Remove list markers
      .filter(r => r.length > 5) // Filter out empty or very short lines
      .slice(0, 3); // Ensure max 3 bullets

    if (recommendations.length === 0) {
        return ['No hay recomendaciones específicas para hoy. ¡Sigue con el buen trabajo!'];
    }

    return recommendations;

  } catch (error) {
    console.error('Error al generar recomendaciones:', error);
    return [
      'No se pudieron generar las recomendaciones en este momento.',
    ];
  }
}
