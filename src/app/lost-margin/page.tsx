import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";
import { CreateTaskButton } from "@/components/CreateTaskButton"; // Импорт кнопки

type OrderPosition = {
  priceIn: number;
  priceOut: number;
  oldPriceOut: number;
  quantity: string;
  quantityFinal: string;
  isCanceled: string;
};

type Order = {
  number: string;
  date: string;
  managerId: string;
  positions?: OrderPosition[];
};

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

async function getManagers(): Promise<Manager[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");
  return abcpRequest<Manager[]>("cp/managers", {}, {
    api_url: shop.api_url,
    api_login: shop.api_login,
    api_password_md5: shop.api_password_md5,
  });
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

type PageProps = {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
};

export default async function LostMarginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "this_month";
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

  let totalPlannedMargin = 0;
  let totalActualMargin = 0;
  let totalLostMargin = 0;

  const managerStats = new Map<string, { lostMargin: number; discountsCount: number }>();
  const ordersWithDiscounts: Array<{
    number: string;
    managerId: string;
    lostMargin: number;
    oldRevenue: number;
    actualRevenue: number;
  }> = [];

  for (const order of orders) {
    if (!order.positions) continue;

    let orderLostMargin = 0;
    let orderOldRevenue = 0;
    let orderActualRevenue = 0;

    for (const pos of order.positions) {
      if (pos.isCanceled === "1") continue;

      const qty = Number(pos.quantityFinal || pos.quantity || 0);
      const priceIn = Number(pos.priceIn || 0);
      const priceOut = Number(pos.priceOut || 0);
      const oldPriceOut = Number(pos.oldPriceOut || 0) > 0 ? Number(pos.oldPriceOut) : priceOut;

      const plannedMargin = (oldPriceOut - priceIn) * qty;
      const actualMargin = (priceOut - priceIn) * qty;

      totalPlannedMargin += plannedMargin;
      totalActualMargin += actualMargin;

      orderOldRevenue += oldPriceOut * qty;
      orderActualRevenue += priceOut * qty;

      if (oldPriceOut > priceOut) {
        const lost = (oldPriceOut - priceOut) * qty;
        totalLostMargin += lost;
        orderLostMargin += lost;
      }
    }

    if (orderLostMargin > 0) {
      ordersWithDiscounts.push({
        number: order.number,
        managerId: order.managerId || "0",
        lostMargin: orderLostMargin,
        oldRevenue: orderOldRevenue,
        actualRevenue: orderActualRevenue,
      });

      const managerId = order.managerId || "0";
      const existing = managerStats.get(managerId);
      if (existing) {
        existing.lostMargin += orderLostMargin;
        existing.discountsCount += 1;
      } else {
        managerStats.set(managerId, { lostMargin: orderLostMargin, discountsCount: 1 });
      }
    }
  }

  const managerStatsArray = Array.from(managerStats.entries())
    .map(([id, data]) => ({
      id,
      name: getManagerName(id, managers),
      lostMargin: data.lostMargin,
      discountsCount: data.discountsCount,
    }))
    .sort((a, b) => b.lostMargin - a.lostMargin);

  ordersWithDiscounts.sort((a, b) => b.lostMargin - a.lostMargin);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Аудит потерянной маржи</h1>
            <p className="mt-1 text-sm text-slate-500">
              Скидки, которые менеджеры сделали вручную, снизив прибыль компании
            </p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Плановая маржа</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalPlannedMargin).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-slate-500">Если бы продавали без скидок</div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Фактическая маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(totalActualMargin).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-green-700">Что мы получили по факту</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="text-sm text-red-700">Потерянная маржа</div>
                <div className="mt-2 text-3xl font-bold text-red-700">
                  {Math.round(totalLostMargin).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-red-700">Слили из-за ручных скидок</div>
              </div>
            </div>

            {/* Топ менеджеров по потерянной марже */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Кто раздает скидки</h2>
                <p className="text-xs text-slate-500 mt-1">Рейтинг менеджеров по сумме потерянной прибыли</p>
              </div>
              {managerStatsArray.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  За этот период ручных скидок не было. Отличная работа!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Заказов со скидками</th>
                        <th className="px-4 py-3 font-medium">Потерянная маржа</th>
                        <th className="px-4 py-3 font-medium">Действие</th> {/* Новая колонка */}
                      </tr>
                    </thead>
                    <tbody>
                      {managerStatsArray.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <Link href={"/manager/" + m.id} className="hover:text-blue-600">{m.name}</Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{m.discountsCount}</td>
                          <td className="px-4 py-3 font-medium text-red-600">
                            {Math.round(m.lostMargin).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            <CreateTaskButton clientId={m.id} clientName={m.name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Заказы с наибольшей потерей маржи */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Заказы со скидками</h2>
                <p className="text-xs text-slate-500 mt-1">Топ-50 заказов, где цена была снижена вручную</p>
              </div>
              {ordersWithDiscounts.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Нет заказов со скидками за этот период.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">№ заказа</th>
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Было бы выручки</th>
                        <th className="px-4 py-3 font-medium">Стало выручки</th>
                        <th className="px-4 py-3 font-medium">Потерянная маржа</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithDiscounts.slice(0, 50).map((o) => (
                        <tr key={o.number} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">
                            <Link href={"/order/" + o.number} className="hover:underline">{o.number}</Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <Link href={"/manager/" + o.managerId} className="hover:text-blue-600">
                              {getManagerName(o.managerId, managers)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 line-through">
                            {Math.round(o.oldRevenue).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {Math.round(o.actualRevenue).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 font-medium text-red-600">
                            - {Math.round(o.lostMargin).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
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