import Link from "next/link";
import {
  abcpRequest,
  formatDate,
  hoursSince,
  isStuckOrder,
  calcOrderMargin,
  OrderPosition,
} from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { RevenueChart } from "@/components/RevenueChart";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  userName: string;
  date: string;
  dateUpdated: string;
  positionsQuantity: number;
  managerId: string;
  positions?: OrderPosition[];
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
  margin: number;
  marginPercent: number;
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

  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  const data = await abcpRequest<Order[]>(
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

  return data;
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
    const orderMargin = calcOrderMargin(order.positions);
    const existing = statsMap.get(id);

    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += Number(order.sum || 0);
      existing.margin += orderMargin;
      if (order.paid) existing.paidCount += 1;
    } else {
      statsMap.set(id, {
        id,
        name: getManagerName(id, managers),
        ordersCount: 1,
        revenue: Number(order.sum || 0),
        paidCount: order.paid ? 1 : 0,
        avgCheck: 0,
        margin: orderMargin,
        marginPercent: 0,
      });
    }
  }

  const stats = Array.from(statsMap.values());

  for (const s of stats) {
    s.avgCheck = s.ordersCount > 0 ? s.revenue / s.ordersCount : 0;
    s.marginPercent = s.revenue > 0 ? (s.margin / s.revenue) * 100 : 0;
  }

  stats.sort((a, b) => b.margin - a.margin);

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
  const totalMargin = orders.reduce(
    (sum, order) => sum + calcOrderMargin(order.positions),
    0
  );
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const ordersWithoutManager = orders.filter(
    (o) => !o.managerId || o.managerId === "0"
  ).length;

  const STUCK_HOURS = 24;
  const stuckOrders = orders
    .filter((o) => !o.paid && isStuckOrder(o.dateUpdated, STUCK_HOURS))
    .sort((a, b) => hoursSince(b.dateUpdated) - hoursSince(a.dateUpdated));
  const stuckOrdersCount = stuckOrders.length;

  const managerStats = calcManagerStats(orders, managers);

  // Подготовка данных для графика
  const chartMap = new Map<string, { revenue: number; margin: number; time: number }>();
  for (const order of orders) {
    const dateStr = order.date.split(" ")[0]; // Берем только дату "ГГГГ-ММ-ДД"
    const orderDate = new Date(dateStr);
    if (isNaN(orderDate.getTime())) continue;

    const day = String(orderDate.getDate()).padStart(2, "0");
    const month = String(orderDate.getMonth() + 1).padStart(2, "0");
    const dateKey = `${day}.${month}`;

    const sum = Number(order.sum || 0);
    const margin = calcOrderMargin(order.positions);

    const existing = chartMap.get(dateKey);
    if (existing) {
      existing.revenue += sum;
      existing.margin += margin;
    } else {
      chartMap.set(dateKey, { revenue: sum, margin: margin, time: orderDate.getTime() });
    }
  }

  const chartData = Array.from(chartMap.entries())
    .sort((a, b) => a[1].time - b[1].time)
    .map(([date, values]) => ({
      date,
      revenue: Math.round(values.revenue),
      margin: Math.round(values.margin),
    }));

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Заголовок */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
            <p className="mt-1 text-sm text-slate-500">
              Реальные данные из ABCP
            </p>
          </div>

          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={"/dashboard?period=" + p.key}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                  (period === p.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100")
                }
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : (
          <>
            {/* Метрики */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Заказов</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Оплачено: {paidOrders}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Средний чек: {Math.round(avgCheck).toLocaleString("ru-RU")} ₽
                </div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-green-700">
                  Маржинальность: {marginPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* График выручки и маржи */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Динамика выручки и маржи</h2>
              <RevenueChart data={chartData} />
            </div>

            {ordersWithoutManager > 0 && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-semibold text-amber-800">
                  Заказов без менеджера: {ordersWithoutManager}
                </div>
                <div className="mt-1 text-sm text-amber-700">
                  Эти заказы поступили с сайта и не назначены ни на одного менеджера.
                </div>
              </div>
            )}

            {stuckOrdersCount > 0 && (
              <div className="mt-6 rounded-xl border border-red-200 bg-white shadow-sm">
                <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                  <h2 className="font-semibold text-red-800">
                    ⚠️ Зависшие заказы: {stuckOrdersCount}
                  </h2>
                  <p className="mt-1 text-sm text-red-700">
                    Не оплачены и без движения более {STUCK_HOURS} часов
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">№ заказа</th>
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Сумма</th>
                        <th className="px-4 py-3 font-medium">Простой</th>
                        <th className="px-4 py-3 font-medium">Обновлён</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stuckOrders.slice(0, 20).map((order) => {
                        const hours = hoursSince(order.dateUpdated);
                        const days = Math.floor(hours / 24);
                        return (
                          <tr key={order.number} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-blue-600">{order.number}</td>
                            <td className="px-4 py-3 text-slate-700">{order.userName || "—"}</td>
                            <td className="px-4 py-3">
                              <Link
                                href={"/manager/" + (order.managerId || "0")}
                                className="text-slate-700 hover:text-blue-600"
                              >
                                {getManagerName(order.managerId, managers)}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="px-4 py-3">
                              <span className={days >= 7 ? "font-semibold text-red-600" : "text-amber-600"}>
                                {days > 0 ? days + " дн" : hours + " ч"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{order.dateUpdated}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {stuckOrders.length > 20 && (
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center text-sm text-slate-600">
                    Показано первые 20 из {stuckOrders.length} зависших заказов
                  </div>
                )}
              </div>
            )}

            {/* Статистика по менеджерам */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Статистика по менеджерам</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Заказов</th>
                      <th className="px-4 py-3 font-medium">Выручка</th>
                      <th className="px-4 py-3 font-medium">Маржа</th>
                      <th className="px-4 py-3 font-medium">Маржинальность</th>
                      <th className="px-4 py-3 font-medium">Оплачено</th>
                      <th className="px-4 py-3 font-medium">Средний чек</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {m.id === "0" ? (
                            <Link href={"/manager/" + m.id} className="text-amber-600 hover:text-amber-700">
                              {m.name}
                            </Link>
                          ) : (
                            <Link href={"/manager/" + m.id} className="text-slate-900 hover:text-blue-600">
                              {m.name}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.ordersCount}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {m.revenue.toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-4 py-3 font-medium text-green-700">
                          {Math.round(m.margin).toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-4 py-3">
                          <span className={
                            m.marginPercent >= 15 ? "text-green-700 font-medium" :
                            m.marginPercent >= 5 ? "text-amber-600 font-medium" :
                            "text-red-600 font-medium"
                          }>
                            {m.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.paidCount}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {Math.round(m.avgCheck).toLocaleString("ru-RU")} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Заказы за период */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Заказы за период</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
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
                      <tr key={order.number} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-blue-600">{order.number}</td>
                        <td className="px-4 py-3 text-slate-700">{order.userName || "—"}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={"/manager/" + (order.managerId || "0")}
                            className="text-slate-700 hover:text-blue-600"
                          >
                            {getManagerName(order.managerId, managers)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-4 py-3 text-slate-700">{order.positionsQuantity}</td>
                        <td className="px-4 py-3">
                          {order.paid ? (
                            <span className="text-green-600 font-medium">Да</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Нет</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{order.dateUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}