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
      <Link href="/salary" className="text-sm text-slate-400 hover:text-white">
        Зарплата
      </Link>
      <Link href="/api-test" className="text-sm text-slate-400 hover:text-white">
        API test
      </Link>
    </div>
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
    <div className="text-sm text-slate-400">Заказов</div>
    <div className="mt-2 text-3xl font-bold">{totalOrders}</div>
    <div className="mt-1 text-xs text-slate-500">
      Оплачено: {paidOrders}
    </div>
  </div>

  <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
    <div className="text-sm text-slate-400">Выручка</div>
    <div className="mt-2 text-3xl font-bold">
      {totalRevenue.toLocaleString("ru-RU")} ₽
    </div>
    <div className="mt-1 text-xs text-slate-500">
      Средний чек: {Math.round(avgCheck).toLocaleString("ru-RU")} ₽
    </div>
  </div>

  <div className="rounded-xl border border-green-800/50 bg-green-900/10 p-5">
    <div className="text-sm text-green-300/70">Маржа</div>
    <div className="mt-2 text-3xl font-bold text-green-400">
      {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
    </div>
    <div className="mt-1 text-xs text-green-300/70">
      Маржинальность: {marginPercent.toFixed(1)}%
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
            {stuckOrdersCount > 0 && (
  <div className="mt-6 rounded-xl border border-red-800 bg-red-900/20">
    <div className="border-b border-red-800/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-red-400">
            ⚠️ Зависшие заказы: {stuckOrdersCount}
          </h2>
          <p className="mt-1 text-sm text-red-300/70">
            Не оплачены и без движения более {STUCK_HOURS} часов
          </p>
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-red-800/50 text-left text-red-300/70">
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
              <tr key={order.number} className="border-b border-red-800/30 hover:bg-red-900/20">
                <td className="px-4 py-3 font-medium text-blue-400">{order.number}</td>
                <td className="px-4 py-3 text-slate-300">{order.userName || "—"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={"/manager/" + (order.managerId || "0")}
                    className="text-slate-300 hover:text-blue-400"
                  >
                    {getManagerName(order.managerId, managers)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                </td>
                <td className="px-4 py-3">
                  <span className={days >= 7 ? "text-red-400 font-semibold" : "text-amber-400"}>
                    {days > 0 ? days + " дн" : hours + " ч"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{order.dateUpdated}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {stuckOrders.length > 20 && (
      <div className="border-t border-red-800/50 px-6 py-3 text-center text-sm text-red-300/70">
        Показано первые 20 из {stuckOrders.length} зависших заказов
      </div>
    )}
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
                    <th className="px-4 py-3 font-medium">Маржа</th>
                    <th className="px-4 py-3 font-medium">Маржинальность</th>
                    <th className="px-4 py-3 font-medium">Оплачено</th>
                    <th className="px-4 py-3 font-medium">Средний чек</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats.map((m) => (
  <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
    <td className="px-4 py-3 font-medium">
      {m.id === "0" ? (
        <Link href={"/manager/" + m.id} className="text-amber-400 hover:text-amber-300">
          {m.name}
        </Link>
      ) : (
        <Link href={"/manager/" + m.id} className="text-white hover:text-blue-400">
          {m.name}
        </Link>
      )}
    </td>
    <td className="px-4 py-3 text-slate-300">{m.ordersCount}</td>
    <td className="px-4 py-3 text-slate-300">
      {m.revenue.toLocaleString("ru-RU")} ₽
    </td>
    <td className="px-4 py-3 font-medium text-green-400">
      {Math.round(m.margin).toLocaleString("ru-RU")} ₽
    </td>
    <td className="px-4 py-3">
      <span className={
        m.marginPercent >= 15 ? "text-green-400" :
        m.marginPercent >= 5 ? "text-amber-400" :
        "text-red-400"
      }>
        {m.marginPercent.toFixed(1)}%
      </span>
    </td>
    <td className="px-4 py-3 text-slate-300">{m.paidCount}</td>
    <td className="px-4 py-3 text-slate-300">
      {Math.round(m.avgCheck).toLocaleString("ru-RU")} ₽
    </td>
  </tr>
))}
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
                        <td className="px-4 py-3">
  <Link
    href={"/manager/" + (order.managerId || "0")}
    className="text-slate-300 hover:text-blue-400"
  >
    {getManagerName(order.managerId, managers)}
  </Link>
</td>
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