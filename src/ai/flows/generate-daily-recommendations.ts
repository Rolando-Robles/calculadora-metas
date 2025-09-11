// src/ai/flows/generate-daily-recommendations.ts
'use server';

/**
 * @fileOverview Generates personalized daily sales recommendations for sales people.
 *
 * - generateDailyRecommendations - A function that generates daily recommendations.
 * - GenerateDailyRecommendationsInput - The input type for the generateDailyRecommendations function.
 * - GenerateDailyRecommendationsOutput - The return type for the generateDailyRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyRecommendationsInputSchema = z.object({
  recentPerformanceData: z
    .string()
    .describe('Recent sales performance data for the salesperson.'),
  goals: z.string().describe('The salesperson’s current goals.'),
  incentiveScheme: z.string().describe('The current incentive scheme details.'),
});
export type GenerateDailyRecommendationsInput = z.infer<typeof GenerateDailyRecommendationsInputSchema>;

const GenerateDailyRecommendationsOutputSchema = z.object({
  recommendations: z
    .string()
    .describe('A list of personalized daily recommendations for the salesperson.'),
});
export type GenerateDailyRecommendationsOutput = z.infer<typeof GenerateDailyRecommendationsOutputSchema>;

export async function generateDailyRecommendations(
  input: GenerateDailyRecommendationsInput
): Promise<GenerateDailyRecommendationsOutput> {
  return generateDailyRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyRecommendationsPrompt',
  input: {schema: GenerateDailyRecommendationsInputSchema},
  output: {schema: GenerateDailyRecommendationsOutputSchema},
  prompt: `Eres un asesor de ventas experto que brinda recomendaciones diarias personalizadas a los vendedores para ayudarles a mejorar su rendimiento y aumentar sus comisiones.

  Utiliza los siguientes datos de rendimiento recientes, objetivos y esquemas de incentivos para generar hasta tres recomendaciones accionables para el vendedor.

  Datos de rendimiento recientes: {{{recentPerformanceData}}}
  Objetivos: {{{goals}}}
  Esquema de incentivos: {{{incentiveScheme}}}

  Recomendaciones:`,
});

const generateDailyRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateDailyRecommendationsFlow',
    inputSchema: GenerateDailyRecommendationsInputSchema,
    outputSchema: GenerateDailyRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
