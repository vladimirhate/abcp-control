export type SalaryRules = {
  baseSalary: number;
  revenuePercent: number;
  marginPercent: number;
  paidRevenuePercent: number;
  planThreshold: number;
  planBonus: number;
};

export type SalaryCalculation = {
  managerId: string;
  managerName: string;
  ordersCount: number;
  revenue: number;
  margin: number;
  paidRevenue: number;
  baseSalary: number;
  revenueBonus: number;
  marginBonus: number;
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
  margin: number,
  paidRevenue: number,
  rules: SalaryRules
): SalaryCalculation {
  const baseSalary = rules.baseSalary;
  const revenueBonus = (revenue * rules.revenuePercent) / 100;
  const marginBonus = (margin * rules.marginPercent) / 100;
  const paidRevenueBonus = (paidRevenue * rules.paidRevenuePercent) / 100;

  const planCompleted = revenue >= rules.planThreshold;
  const planBonus = planCompleted ? rules.planBonus : 0;

  const total =
    baseSalary + revenueBonus + marginBonus + paidRevenueBonus + planBonus;

  return {
    managerId,
    managerName,
    ordersCount,
    revenue,
    margin,
    paidRevenue,
    baseSalary,
    revenueBonus,
    marginBonus,
    paidRevenueBonus,
    planBonus,
    planCompleted,
    total,
  };
}

export const DEFAULT_RULES: SalaryRules = {
  baseSalary: 30000,
  revenuePercent: 1,
  marginPercent: 20,
  paidRevenuePercent: 2,
  planThreshold: 500000,
  planBonus: 5000,
};