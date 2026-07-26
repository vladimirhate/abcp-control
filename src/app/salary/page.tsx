import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { calculateSalary, DEFAULT_RULES, SalaryCalculation } from "@/lib/salary";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  managerId: string;
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

  return abcpRequest<Order[]>("cp/orders", {
    dateCreatedStart: formatDate(dateStart),
    dateCreatedEnd: formatDate(dateEnd),
    limit: "1000",
  });
}

async function getManagers(): Promise<Manager[]> {
  return abcpRequest<Manager[]>("cp/managers");
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
  let error: string | null = null;

  try {
    const results = await Promise.all([getOrders(), getManagers()]);
    orders = results[0];
    managers = results[1];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const managerData = new Map<
    string,
    { ordersCount: number; revenue: number; paidRevenue: number }
  >();

  for (const order of orders) {
    const id = order.managerId || "0";
    if (id === "0") continue;

    const existing = managerData.get(id);
    const sum = Number(order.sum || 0);
    const paidSum = order.paid ? sum : 0;

    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += sum;
      existing.paidRevenue += paidSum;
    } else {
      managerData.set(id, {
        ordersCount: 1,
        revenue: sum,
        paidRevenue: paidSum,
      });
    }
  }

  const calculations: SalaryCalculation[] = [];

  for (const [managerId, data] of managerData) {
    const managerName = getManagerName(managerId, managers);
    const calc = calculateSalary(
      managerId,
      managerName,
      data.ordersCount,
      data.revenue,
      data.paidRevenue,
      DEFAULT_RULES
    );
    calculations.push(calc);
  }

  calculations.sort((a, b) => b.total - a.total);

  const totalFot = calculations.reduce((sum, c) => sum + c.total, 0);
  const totalRevenue = calculations.reduce((sum, c) => sum + c.revenue, 0);

  const now = new Date();
  const monthName = now.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
              Дашборд
            </Link>
            <Link href="/api-test" className="text-sm text-slate-400 hover:text-white">
              API test
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">Расчёт зарплаты</h1>
          <p className="mt-2 text-slate-400">
            Период: {monthName}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-300">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Фонд оплаты труда</div>
                <div className="mt-2 text-3xl font-bold">
                  {totalFot.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Общая выручка</div>
                <div className="mt-2 text-3xl font-bold">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Менеджеров</div>
                <div className="mt-2 text-3xl font-bold">
                  {calculations.length}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-semibold">Текущая формула ЗП</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-slate-400">Оклад</div>
                  <div className="font-medium">{DEFAULT_RULES.baseSalary.toLocaleString("ru-RU")} ₽</div>
                </div>
                <div>
                  <div className="text-slate-400">% от выручки</div>
                  <div className="font-medium">{DEFAULT_RULES.revenuePercent}%</div>
                </div>
                <div>
                  <div className="text-slate-400">% от оплаченного</div>
                  <div className="font-medium">{DEFAULT_RULES.paidRevenuePercent}%</div>
                </div>
                <div>
                  <div className="text-slate-400">Бонус за план ({DEFAULT_RULES.planThreshold.toLocaleString("ru-RU")} ₽)</div>
                  <div className="font-medium">{DEFAULT_RULES.planBonus.toLocaleString("ru-RU")} ₽</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-6 py-4">
                <h2 className="font-semibold">Расчёт по менеджерам</h2>
              </div>

              {calculations.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Нет данных для расчёта. У менеджеров нет заказов за этот месяц.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-slate-400">
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Заказов</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Оклад</th>
                        <th className="px-4 py-3 font-medium">% выручки</th>
                        <th className="px-4 py-3 font-medium">% оплаченного</th>
                        <th className="px-4 py-3 font-medium">Бонус план</th>
                        <th className="px-4 py-3 font-medium">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.map((c) => (
                        <tr key={c.managerId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium">
                            <Link href={"/manager/" + c.managerId} className="text-white hover:text-blue-400">
                              {c.managerName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{c.ordersCount}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {c.revenue.toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {c.baseSalary.toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-green-400">
                            +{Math.round(c.revenueBonus).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-green-400">
                            +{Math.round(c.paidRevenueBonus).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            {c.planCompleted ? (
                              <span className="text-green-400">
                                +{c.planBonus.toLocaleString("ru-RU")} ₽
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-lg font-bold text-white">
                            {Math.round(c.total).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-700">
                        <td colSpan={7} className="px-4 py-4 font-semibold">
                          ИТОГО ФОТ
                        </td>
                        <td className="px-4 py-4 text-lg font-bold text-blue-400">
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
    </main>
  );
}