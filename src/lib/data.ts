import type { User, KpiData, ChartData, IncentivePeriod, MonthlyCommission } from './types';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export const mockUser: User = {
  name: 'Daniela Avendaño',
  kiosco: 'Amecameca',
  product: 'TuNegocio',
  avatarUrl: 'https://picsum.photos/seed/user/100/100',
};

export const mockKpiData: Record<'day' | 'week' | 'month', KpiData> = {
  day: {
    requests: { value: 3, goal: 5, label: 'Solicitudes' },
    approved: { value: 2, goal: 4, label: 'Aprobadas' },
    disbursed: { value: 1, goal: 3, label: 'Desembolsadas' },
    amount: { value: 18000, goal: 45000, label: 'Monto' },
  },
  week: {
    requests: { value: 15, goal: 25, label: 'Solicitudes' },
    approved: { value: 11, goal: 20, label: 'Aprobadas' },
    disbursed: { value: 9, goal: 15, label: 'Desembolsadas' },
    amount: { value: 135000, goal: 225000, label: 'Monto' },
  },
  month: {
    requests: { value: 62, goal: 100, label: 'Solicitudes' },
    approved: { value: 45, goal: 80, label: 'Aprobadas' },
    disbursed: { value: 38, goal: 60, label: 'Desembolsadas' },
    amount: { value: 580000, goal: 900000, label: 'Monto' },
  },
};

export const mockThirtyDayData: ChartData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
    value: Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000 + i * 500,
    goal: 22000,
  };
});


export const mockIncentiveHistory: IncentivePeriod[] = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i + 1);
    const base = 10000 + Math.random() * 5000;
    const multiplier = 1 + (Math.random() * 0.15);
    return {
        period: format(date, 'MMMM yyyy', { locale: es }),
        baseCommission: base,
        multiplier: parseFloat(multiplier.toFixed(2)),
        totalPaid: base * multiplier,
        date: format(date, 'dd/MM/yyyy'),
    };
});

export const mockMonthlyCommissions: MonthlyCommission[] = Array.from({ length: 12 }).map((_, i) => {
    const date = subMonths(new Date(), 11 - i);
    return {
        month: format(date, 'MMM', { locale: es }),
        commission: 12000 + Math.random() * 8000
    };
});
