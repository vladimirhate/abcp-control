import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { fetchStatusHistory } from "@/lib/history";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type OrderPosition = { id: string };
type Order = { number: string; date: string; managerId: string; positions?: OrderPosition[] };
type Manager = { id: string; firstName: string; lastName: string; email: string };

async function getOrders(period: string, from?: string, to?: string): Promise<Order[]> {
  const { dateStart, dateEnd } = getRange(period, from, to);
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");
  return abcpRequest<Order[]>("cp/orders", { dateCreatedStart: formatDate(dateStart), dateCreatedEnd: formatDate(dateEnd), limit: "1000" }, { api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5 });
}

async function getManagers(): Promise<Manager[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");
  return abcpRequest<Manager[]>("cp/managers", {}, { api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5 });
}

function getManagerName(managerId: string, managers: Manager[]): string {
  if (!managerId || managerId === "0") return "Без менеджера";
  const manager = managers.find((m) => m.id === managerId);
  if (!manager) return "ID: " + managerId;
  const fullName = (manager.firstName + " " + manager.lastName).trim();
  return fullName || manager.email || "ID: " + managerId;
}

function formatHours(hours: number): string {
  if (hours < 1) return Math.round(hours * 60) + " мин";
  if (hours < 24) return hours.toFixed(1) + " ч";
  return (hours / 24).toFixed(1) + " дн";
}

type PageProps = { searchParams: Promise<{ period?: string; from?: string; to?: string }> };

export default async function ManagersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last7";
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let managers: Manager[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([getOrders(period, from, to), getManagers()]);
    orders = results[0];
    managers = results[1];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const allPositionIds = orders.flatMap(o => o.positions?.map(p => p.id) || []);
  const history = error ? {} : await fetchStatusHistory(allPositionIds);

  const managerStats = new Map<string, { totalReactionHours: number; ordersCount: number }>();

  for (const order of orders) {
    if (!order.positions || order.positions.length === 0) continue;
    let earliestStatusChange: Date | null = null;

    for (const pos of order.positions) {
      const posHistory = history[pos.id];
      if (posHistory && posHistory.length > 0) {
        const sortedHist = [...posHistory].sort((a, b) => a.datetime.localeCompare(b.datetime));
        const firstChange = new Date(sortedHist[0].datetime.replace(" ", "T"));
        if (!isNaN(firstChange.getTime())) {
          if (!earliestStatusChange || firstChange < earliestStatusChange) {
            earliestStatusChange = firstChange;
          }
        }
      }
    }

    if (earliestStatusChange) {
      const orderDate = new Date(order.date.replace(" ", "T"));
      if (!isNaN(orderDate.getTime())) {
        const diffMs = earliestStatusChange.getTime() - orderDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours < 168) {
          const managerId = order.managerId || "0";
          const existing = managerStats.get(managerId);
          if (existing) {
            existing.totalReactionHours += diffHours;
            existing.ordersCount += 1;
          } else {
            managerStats.set(managerId, { totalReactionHours: diffHours, ordersCount: 1 });
          }
        }
      }
    }
  }

  const stats = Array.from(managerStats.entries()).map(([id, data]) => ({
    id,
    name: getManagerName(id, managers),
    ordersCount: data.ordersCount,
    avgReactionHours: data.ordersCount > 0 ? data.totalReactionHours / data.ordersCount : 0,
  }));

  stats.sort((a, b) => a.avgReactionHours - b.avgReactionHours);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Менеджеры</h1>
            <p className="mt-1 text-sm text-slate-500">Скорость реакции на заказы</p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Рейтинг скорости реакции</h2>
              <p className="text-xs text-slate-500 mt-1">Время от создания заказа до первой смены статуса</p>
            </div>
            {stats.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Нет данных о реакции менеджеров за этот период.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Заказов обработано</th>
                      <th className="px-4 py-3 font-medium">Среднее время реакции</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link href={"/manager/" + s.id} className="hover:text-blue-600">{s.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{s.ordersCount}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${s.avgReactionHours < 1 ? "text-green-700" : s.avgReactionHours < 4 ? "text-amber-600" : "text-red-600"}`}>
                            {formatHours(s.avgReactionHours)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}