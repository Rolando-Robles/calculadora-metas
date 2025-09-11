'use server';

import { z } from 'zod';
import { generateDailyRecommendations as generateDailyRecommendationsFlow } from '@/ai/flows/generate-daily-recommendations';

const dailyCaptureSchema = z.object({
  date: z.string(),
  created: z.coerce.number().min(0),
  approved: z.coerce.number().min(0),
  disbursed: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

export async function saveDailyCapture(prevState: any, formData: FormData) {
  const validatedFields = dailyCaptureSchema.safeParse({
    date: formData.get('date'),
    created: formData.get('created'),
    approved: formData.get('approved'),
    disbursed: formData.get('disbursed'),
    amount: formData.get('amount'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Error de validación. Verifique los datos.',
    };
  }

  // Simulate saving data
  console.log('Saving data:', validatedFields.data);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    message: 'Guardado ✓',
  };
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
    // Split recommendations into a list of strings
    return result.recommendations.split('\n').map(r => r.replace(/•|-/g, '').trim()).filter(r => r.length > 0);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [
      'Error al generar recomendaciones.',
    ];
  }
}
