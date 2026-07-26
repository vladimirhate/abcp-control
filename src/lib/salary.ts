export type SalaryRules = {
  baseSalary: number;
  revenuePercent: number;
  paidRevenuePercent: number;
  planThreshold: number;
  planBonus: number;
};

export type SalaryCalculation = {
  managerId: string;
  managerName: string;
  ordersCount: number;
  revenue: number;
  paidRevenue: number;
  baseSalary: number;
  revenueBonus: number;
  paidRevenueBonus: number;
  planBonus: number;
  planCompleted: boolean;
  total: number;
};

export function calculateSalary(
  managerId: string,
  managerName: string,
  ordersCount: number,
  revenue: number,
  paidRevenue: number,
  rules: SalaryRules
): SalaryCalculation {
  const baseSalary = rules.baseSalary;
  const revenueBonus = (revenue * rules.revenuePercent) / 100;
  const paidRevenueBonus = (paidRevenue * rules.paidRevenuePercent) / 100;

  const planCompleted = revenue >= rules.planThreshold;
  const planBonus = planCompleted ? rules.planBonus : 0;

  const total = baseSalary + revenueBonus + paidRevenueBonus + planBonus;

  return {
    managerId,
    managerName,
    ordersCount,
    revenue,
    paidRevenue,
    baseSalary,
    revenueBonus,
    paidRevenueBonus,
    planBonus,
    planCompleted,
    total,
  };
}

export const DEFAULT_RULES: SalaryRules = {
  baseSalary: 30000,
  revenuePercent: 3,
  paidRevenuePercent: 5,
  planThreshold: 500000,
  planBonus: 5000,
};