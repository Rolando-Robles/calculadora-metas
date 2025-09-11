export type TimeRange = 'day' | 'week' | 'month';

export interface User {
  name: string;
  kiosco: string;
  product: string;
  avatarUrl: string;
}

export interface Kpi {
  value: number;
  goal: number;
  label: string;
}

export interface KpiData {
  requests: Kpi;
  approved: Kpi;
  disbursed: Kpi;
  amount: Kpi;
}

export interface ChartData {
  date: string;
  value: number;
  goal: number;
}

export interface IncentivePeriod {
  period: string;
  baseCommission: number;
  multiplier: number;
  totalPaid: number;
  date: string;
}

export interface MonthlyCommission {
  month: string;
  commission: number;
}
