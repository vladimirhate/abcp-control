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
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

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

async function getOrders(period: string, from?: string, to?: string): Promise<Order[]> {
  const { dateStart, dateEnd } = getRange(period, from, to);
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

// Новая функция для получения заказов за вчера
async function getYesterdayOrders(): Promise<Order[]> {
  const yStart = new Date();
  yStart.setDate(yStart.getDate() - 1);
  yStart.setHours(0, 0, 0, 0);

  const yEnd = new Date();
  yEnd.setDate(yEnd.getDate() - 1);
  yEnd.setHours(23, 59, 59, 0);

  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Order[]>(
    "cp/orders",
    {
      dateCreatedStart: formatDate(yStart),
      dateCreatedEnd: formatDate(yEnd),
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

function getManagerName(managerId: string, managers: any[]): string {
  if (!managerId || managerId === "0") return "Без менеджера";
  const manager = managers.find((m) => String(m.id) === String(managerId));
  if (!manager) return "ID: " + managerId;
  
  // На случай, если ABCP возвращает name/surname вместо firstName/lastName
  const first = manager.firstName || manager.name || "";
  const last = manager.lastName || manager.surname || "";
  const fullName = `${first} ${last}`.trim();
  
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
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last7";
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let yesterdayOrders: Order[] = [];
  let managers: Manager[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([
      getOrders(period, from, to), 
      getManagers(),
      getYesterdayOrders()
    ]);
    orders = results[0];
    managers = results[1];
    yesterdayOrders = results[2];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Метрики за вчера
  const yTotalOrders = yesterdayOrders.length;
  const yTotalRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.sum || 0), 0);
  const yPaidOrders = yesterdayOrders.filter(o => o.paid).length;
  const yTotalMargin = yesterdayOrders.reduce((sum, o) => sum + calcOrderMargin(o.positions), 0);

  // Основные метрики
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.sum || 0), 0);
  const paidOrders = orders.filter((order) => order.paid).length;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalMargin = orders.reduce((sum, order) => sum + calcOrderMargin(order.positions), 0);
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const ordersWithoutManager = orders.filter((o) => !o.managerId || o.managerId === "0").length;

  const STUCK_HOURS = 24;
  const stuckOrders = orders
    .filter((o) => !o.paid && isStuckOrder(o.dateUpdated, STUCK_HOURS))
    .sort((a, b) => hoursSince(b.dateUpdated) - hoursSince(a.dateUpdated));
  const stuckOrdersCount = stuckOrders.length;

  const managerStats = calcManagerStats(orders, managers);

  const chartMap = new Map<string, { revenue: number; margin: number; time: number }>();
  for (const order of orders) {
    const dateStr = order.date.split(" ")[0];
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

  // Форматируем дату вчера для заголовка
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
          <p className="mt-1 text-sm text-slate-500">Реальные данные из ABCP</p>
        </div>

        {/* УТРЕННЯЯ СВОДКА */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-900">☀️ Сводка за вчера ({yesterdayStr})</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Заказов упало</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{yTotalOrders}</div>
              <div className="text-xs text-green-600 mt-1">Оплачено: {yPaidOrders}</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Выручка</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{Math.round(yTotalRevenue).toLocaleString("ru-RU")} ₽</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Маржа</div>
              <div className="mt-1 text-2xl font-bold text-green-700">{Math.round(yTotalMargin).toLocaleString("ru-RU")} ₽</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Средний чек</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {yTotalOrders > 0 ? Math.round(yTotalRevenue / yTotalOrders).toLocaleString("ru-RU") : 0} ₽
              </div>
            </div>
          </div>
        </div>

        {/* Основной фильтр и метрики */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Общая аналитика</h2>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Заказов</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</div>
                <div className="mt-1 text-xs text-slate-500">Оплачено: {paidOrders}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{totalRevenue.toLocaleString("ru-RU")} ₽</div>
                <div className="mt-1 text-xs text-slate-500">Средний чек: {Math.round(avgCheck).toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">{Math.round(totalMargin).toLocaleString("ru-RU")} ₽</div>
                <div className="mt-1 text-xs text-green-700">Маржинальность: {marginPercent.toFixed(1)}%</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Динамика выручки и маржи</h2>
              <RevenueChart data={chartData} />
            </div>

            {ordersWithoutManager > 0 && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-semibold text-amber-800">Заказов без менеджера: {ordersWithoutManager}</div>
                <div className="mt-1 text-sm text-amber-700">Эти заказы поступили с сайта и не назначены ни на одного менеджера.</div>
              </div>
            )}

            {stuckOrdersCount > 0 && (
              <div className="mt-6 rounded-xl border border-red-200 bg-white shadow-sm">
                <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                  <h2 className="font-semibold text-red-800">⚠️ Зависшие заказы: {stuckOrdersCount}</h2>
                  <p className="mt-1 text-sm text-red-700">Не оплачены и без движения более {STUCK_HOURS} часов</p>
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
                              <Link href={"/manager/" + (order.managerId || "0")} className="text-slate-700 hover:text-blue-600">
                                {getManagerName(order.managerId, managers)}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{Number(order.sum || 0).toLocaleString("ru-RU")} ₽</td>
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
                            <Link href={"/manager/" + m.id} className="text-amber-600 hover:text-amber-700">{m.name}</Link>
                          ) : (
                            <Link href={"/manager/" + m.id} className="text-slate-900 hover:text-blue-600">{m.name}</Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.ordersCount}</td>
                        <td className="px-4 py-3 text-slate-700">{m.revenue.toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3 font-medium text-green-700">{Math.round(m.margin).toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3">
                          <span className={m.marginPercent >= 15 ? "text-green-700 font-medium" : m.marginPercent >= 5 ? "text-amber-600 font-medium" : "text-red-600 font-medium"}>
                            {m.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.paidCount}</td>
                        <td className="px-4 py-3 text-slate-700">{Math.round(m.avgCheck).toLocaleString("ru-RU")} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
                          <Link href={"/manager/" + (order.managerId || "0")} className="text-slate-700 hover:text-blue-600">
                            {getManagerName(order.managerId, managers)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{Number(order.sum || 0).toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3 text-slate-700">{order.positionsQuantity}</td>
                        <td className="px-4 py-3">
                          {order.paid ? <span className="text-green-600 font-medium">Да</span> : <span className="text-amber-600 font-medium">Нет</span>}
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