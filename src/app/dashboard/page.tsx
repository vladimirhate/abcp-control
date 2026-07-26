import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  userName: string;
  date: string;
  dateUpdated: string;
  positionsQuantity: number;
  managerId: string;
};

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type ManagerStats = {
  id: string;
  name: string;
  ordersCount: number;
  revenue: number;
  paidCount: number;
  avgCheck: number;
};

type Period = "today" | "week" | "month" | "quarter";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "today", label: "Сегодня", days: 0 },
  { key: "week", label: "7 дней", days: 7 },
  { key: "month", label: "30 дней", days: 30 },
  { key: "quarter", label: "90 дней", days: 90 },
];

function getPeriodRange(period: Period): { dateStart: Date; dateEnd: Date } {
  const dateEnd = new Date();
  dateEnd.setHours(23, 59, 59, 0);

  const dateStart = new Date();

  if (period === "today") {
    dateStart.setHours(0, 0, 0, 0);
  } else {
    const cfg = PERIODS.find((p) => p.key === period);
    const days = cfg ? cfg.days : 30;
    dateStart.setDate(dateStart.getDate() - days);
    dateStart.setHours(0, 0, 0, 0);
  }

  return { dateStart, dateEnd };
}

async function getOrders(period: Period): Promise<Order[]> {
  const { dateStart, dateEnd } = getPeriodRange(period);

  const data = await abcpRequest<Order[]>("cp/orders", {
    dateCreatedStart: formatDate(dateStart),
    dateCreatedEnd: formatDate(dateEnd),
    limit: "1000",
  });

  return data;
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

function calcManagerStats(orders: Order[], managers: Manager[]): ManagerStats[] {
  const statsMap = new Map<string, ManagerStats>();

  for (const order of orders) {
    const id = order.managerId || "0";
    const existing = statsMap.get(id);

    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += Number(order.sum || 0);
      if (order.paid) existing.paidCount += 1;
    } else {
      statsMap.set(id, {
        id,
        name: getManagerName(id, managers),
        ordersCount: 1,
        revenue: Number(order.sum || 0),
        paidCount: order.paid ? 1 : 0,
        avgCheck: 0,
      });
    }
  }

  const stats = Array.from(statsMap.values());

  for (const s of stats) {
    s.avgCheck = s.ordersCount > 0 ? s.revenue / s.ordersCount : 0;
  }

  stats.sort((a, b) => b.revenue - a.revenue);

  return stats;
}

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const periodParam = params?.period;
  const period: Period =
    periodParam === "today" ||
    periodParam === "week" ||
    periodParam === "month" ||
    periodParam === "quarter"
      ? periodParam
      : "month";

  let orders: Order[] = [];
  let managers: Manager[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([getOrders(period), getManagers()]);
    orders = results[0];
    managers = results[1];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.sum || 0),
    0
  );
  const paidOrders = orders.filter((order) => order.paid).length;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const ordersWithoutManager = orders.filter(
    (o) => !o.managerId || o.managerId === "0"
  ).length;

  const managerStats = calcManagerStats(orders, managers);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
          <Link href="/api-test" className="text-sm text-slate-400 hover:text-white">
            API test
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Дашборд собственника</h1>
            <p className="mt-2 text-slate-400">
              Реальные данные из ABCP
            </p>
          </div>

          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={"/dashboard?period=" + p.key}
                className={
                  "rounded-lg px-4 py-2 text-sm font-medium transition " +
                  (period === p.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 text-slate-300 hover:bg-slate-800")
                }
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-300">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Заказов</div>
                <div className="mt-2 text-3xl font-bold">{totalOrders}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Выручка</div>
                <div className="mt-2 text-3xl font-bold">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Оплачено</div>
                <div className="mt-2 text-3xl font-bold text-green-400">{paidOrders}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Средний чек</div>
                <div className="mt-2 text-3xl font-bold">
                  {Math.round(avgCheck).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            {ordersWithoutManager > 0 && (
              <div className="mt-6 rounded-xl border border-amber-800 bg-amber-900/20 p-4">
                <div className="font-semibold text-amber-400">
                  Заказов без менеджера: {ordersWithoutManager}
                </div>
                <div className="mt-1 text-sm text-amber-300/70">
                  Эти заказы поступили с сайта и не назначены ни на одного менеджера.
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-6 py-4">
                <h2 className="font-semibold">Статистика по менеджерам</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Заказов</th>
                      <th className="px-4 py-3 font-medium">Выручка</th>
                      <th className="px-4 py-3 font-medium">Оплачено</th>
                      <th className="px-4 py-3 font-medium">Средний чек</th>
                      <th className="px-4 py-3 font-medium">Доля выручки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.map((m) => {
                      const share = totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0;
                      return (
                        <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium">
                            {m.id === "0" ? (
                              <span className="text-amber-400">{m.name}</span>
                            ) : (
                              <span className="text-white">{m.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{m.ordersCount}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {m.revenue.toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-300">{m.paidCount}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {Math.round(m.avgCheck).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-6 py-4">
                <h2 className="font-semibold">Заказы за период</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">№ заказа</th>
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Сумма</th>
                      <th className="px-4 py-3 font-medium">Позиций</th>
                      <th className="px-4 py-3 font-medium">Оплачен</th>
                      <th className="px-4 py-3 font-medium">Обновлён</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.number} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-blue-400">{order.number}</td>
                        <td className="px-4 py-3 text-slate-300">{order.userName || "—"}</td>
                        <td className="px-4 py-3 text-slate-300">{getManagerName(order.managerId, managers)}</td>
                        <td className="px-4 py-3 text-slate-300">{Number(order.sum || 0).toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3 text-slate-300">{order.positionsQuantity}</td>
                        <td className="px-4 py-3">
                          {order.paid ? (
                            <span className="text-green-400">Да</span>
                          ) : (
                            <span className="text-amber-400">Нет</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{order.dateUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}