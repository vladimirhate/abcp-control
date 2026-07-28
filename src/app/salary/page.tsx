import Link from "next/link";
import { abcpRequest, formatDate, calcOrderMargin, OrderPosition } from "@/lib/abcp";
import { calculateSalary, SalaryCalculation, SalaryRules } from "@/lib/salary";
import { getShop, getSalaryRule } from "@/lib/shop";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppLayout } from "@/components/AppLayout";
import { AdjustmentInput } from "@/components/AdjustmentInput";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  managerId: string;
  positions?: OrderPosition[];
};

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

async function getOrders(): Promise<Order[]> {
  const dateStart = new Date();
  dateStart.setDate(1);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date();
  dateEnd.setHours(23, 59, 59, 0);

  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Order[]>(
    "cp/orders",
    {
      dateCreatedStart: formatDate(dateStart),
      dateCreatedEnd: formatDate(dateEnd),
      limit: "1000",
    },
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

async function getManagers(): Promise<Manager[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Manager[]>(
    "cp/managers",
    {},
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

async function getAdjustments(month: string): Promise<Record<string, { amount: number; reason: string }>> {
  const shop = await getShop();
  if (!shop) return {};

  const { data, error } = await supabaseAdmin
    .from("salary_adjustments")
    .select("manager_id, amount, reason")
    .eq("shop_id", shop.id)
    .eq("month", month);

  if (error || !data) return {};

  const map: Record<string, { amount: number; reason: string }> = {};
  data.forEach((item: any) => {
    map[item.manager_id] = { 
      amount: Number(item.amount), 
      reason: item.reason || "" 
    };
  });
  return map;
}

function getManagerName(managerId: string, managers: Manager[]): string {
  if (!managerId || managerId === "0") return "Без менеджера";
  const manager = managers.find((m) => m.id === managerId);
  if (!manager) return "ID: " + managerId;
  const fullName = (manager.firstName + " " + manager.lastName).trim();
  return fullName || manager.email || "ID: " + managerId;
}

export default async function SalaryPage() {
  let orders: Order[] = [];
  let managers: Manager[] = [];
  let salaryRule: SalaryRules | null = null;
  let adjustments: Record<string, { amount: number; reason: string }> = {};
  let error: string | null = null;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  try {
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден в БД");
    
    const results = await Promise.all([
      getOrders(), 
      getManagers(), 
      getSalaryRule(shop.id),
      getAdjustments(currentMonth)
    ]);
    
    orders = results[0];
    managers = results[1];
    adjustments = results[3];
    const rule = results[2];

    if (rule) {
      salaryRule = {
        baseSalary: Number(rule.base_salary),
        revenuePercent: Number(rule.revenue_percent),
        marginPercent: Number(rule.margin_percent),
        paidRevenuePercent: Number(rule.paid_revenue_percent),
        planThreshold: Number(rule.plan_threshold),
        planBonus: Number(rule.plan_bonus),
      };
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  if (!salaryRule) {
    salaryRule = {
      baseSalary: 30000,
      revenuePercent: 1,
      marginPercent: 20,
      paidRevenuePercent: 2,
      planThreshold: 500000,
      planBonus: 5000,
    };
  }

  const managerData = new Map<string, { ordersCount: number; revenue: number; margin: number; paidRevenue: number }>();

  for (const order of orders) {
    const id = order.managerId || "0";
    if (id === "0") continue;

    const sum = Number(order.sum || 0);
    const orderMargin = calcOrderMargin(order.positions);
    const paidSum = order.paid ? sum : 0;

    const existing = managerData.get(id);
    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += sum;
      existing.margin += orderMargin;
      existing.paidRevenue += paidSum;
    } else {
      managerData.set(id, {
        ordersCount: 1,
        revenue: sum,
        margin: orderMargin,
        paidRevenue: paidSum,
      });
    }
  }

  const calculations: (SalaryCalculation & { adjustment: number; adjustmentReason: string; finalTotal: number })[] = [];

  for (const [managerId, data] of managerData) {
    const managerName = getManagerName(managerId, managers);
    const calc = calculateSalary(
      managerId,
      managerName,
      data.ordersCount,
      data.revenue,
      data.margin,
      data.paidRevenue,
      salaryRule
    );
    
    const adjData = adjustments[managerId] || { amount: 0, reason: "" };
    const finalTotal = calc.total + adjData.amount;

    calculations.push({ ...calc, adjustment: adjData.amount, adjustmentReason: adjData.reason, finalTotal });
  }

  calculations.sort((a, b) => b.finalTotal - a.finalTotal);

  const totalFot = calculations.reduce((sum, c) => sum + c.finalTotal, 0);
  const totalRevenue = calculations.reduce((sum, c) => sum + c.revenue, 0);
  const totalMargin = calculations.reduce((sum, c) => sum + c.margin, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Расчёт зарплаты</h1>
          <p className="mt-1 text-sm text-slate-500">Период: {monthName}</p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">ФОТ (Итог к выдаче)</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalFot).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Менеджеров</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {calculations.length}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Текущая формула ЗП</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <div className="text-slate-500">Оклад</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {salaryRule.baseSalary.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">% от выручки</div>
                  <div className="mt-1 font-medium text-slate-900">{salaryRule.revenuePercent}%</div>
                </div>
                <div>
                  <div className="text-slate-500">% от маржи</div>
                  <div className="mt-1 font-medium text-green-700">
                    {salaryRule.marginPercent}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">% за оплаченное</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {salaryRule.paidRevenuePercent}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">
                    Бонус за {salaryRule.planThreshold.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="mt-1 font-medium text-slate-900">
                    {salaryRule.planBonus.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Расчёт по менеджерам</h2>
                <p className="text-xs text-slate-500 mt-1">Корректировки (штрафы/больничные/премии) сохраняются автоматически на текущий месяц</p>
              </div>

              {calculations.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Нет данных для расчёта. У менеджеров нет заказов за этот месяц.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Авто-расчет</th>
                        <th className="px-4 py-3 font-medium">Корректировка (±)</th>
                        <th className="px-4 py-3 font-medium">Итого к выдаче</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.map((c) => (
                        <tr key={c.managerId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">
                            <Link href={"/manager/" + c.managerId} className="text-slate-900 hover:text-blue-600">
                              {c.managerName}
                            </Link>
                            <div className="text-xs text-slate-400 mt-1">
                              {c.ordersCount} зак. | Маржа: {Math.round(c.margin).toLocaleString("ru-RU")} ₽
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {Math.round(c.total).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            <AdjustmentInput 
                              managerId={c.managerId} 
                              month={currentMonth} 
                              initialAmount={c.adjustment} 
                              initialReason={c.adjustmentReason} 
                            />
                          </td>
                          <td className="px-4 py-3 text-lg font-bold text-slate-900">
                            {Math.round(c.finalTotal).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={3} className="px-4 py-4 font-semibold text-slate-900">
                          ИТОГО ФОТ
                        </td>
                        <td className="px-4 py-4 text-xl font-bold text-blue-600">
                          {Math.round(totalFot).toLocaleString("ru-RU")} ₽
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}