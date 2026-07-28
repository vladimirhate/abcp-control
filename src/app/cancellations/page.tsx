import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type OrderPosition = {
  isCanceled: string;
  status: string;
  priceOut: number;
  quantity: string;
  quantityFinal: string;
  brandFix: string;
  distributorName: string;
};

type Order = {
  number: string;
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

export default async function CancellationsPage({ searchParams }: PageProps) {
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

  let totalLostRevenue = 0;
  let clientCancelsCount = 0;      // isCanceled = 1 (Клиент запросил отмену)
  let supplierCancelsCount = 0;    // quantityFinal = 0 или статус "Отказ" (Отказ поставщика или магазина)

  const brandMap = new Map<string, { name: string; count: number; lostRevenue: number }>();
  const supplierMap = new Map<string, { name: string; count: number; lostRevenue: number }>();
  const managerMap = new Map<string, { id: string; count: number; lostRevenue: number }>();

  for (const order of orders) {
    if (!order.positions) continue;

    for (const pos of order.positions) {
      const qtyOrdered = Number(pos.quantity || 0);
      const qtyFinal = Number(pos.quantityFinal || 0);
      const priceOut = Number(pos.priceOut || 0);
      
      const isClientCancel = pos.isCanceled === "1";
      const isRefusedStatus = pos.status?.toLowerCase().includes("отказ") || pos.status?.toLowerCase().includes("отмен");
      const isSupplierCancel = qtyFinal === 0 && !isClientCancel; // Поставщик не привез или менеджер отменил

      // Считаем позицию отмененной, если клиент запросил отмену, ИЛИ количество стало 0, ИЛИ статус "Отказ"
      if (isClientCancel || isSupplierCancel || isRefusedStatus) {
        
        // Считаем потерю по изначально заказанному количеству
        const lostRev = priceOut * qtyOrdered;
        if (lostRev <= 0) continue;

        totalLostRevenue += lostRev;

        if (isClientCancel) {
          clientCancelsCount += qtyOrdered;
        } else {
          supplierCancelsCount += qtyOrdered;
        }

        const brandName = pos.brandFix || "НЕИЗВЕСТНЫЙ БРЕНД";
        const supName = pos.distributorName || "Неизвестный поставщик";
        const mgrId = order.managerId || "0";

        const b = brandMap.get(brandName) || { name: brandName, count: 0, lostRevenue: 0 };
        b.count += qtyOrdered;
        b.lostRevenue += lostRev;
        brandMap.set(brandName, b);

        const s = supplierMap.get(supName) || { name: supName, count: 0, lostRevenue: 0 };
        s.count += qtyOrdered;
        s.lostRevenue += lostRev;
        supplierMap.set(supName, s);

        const m = managerMap.get(mgrId) || { id: mgrId, count: 0, lostRevenue: 0 };
        m.count += qtyOrdered;
        m.lostRevenue += lostRev;
        managerMap.set(mgrId, m);
      }
    }
  }

  const brands = Array.from(brandMap.values()).sort((a, b) => b.lostRevenue - a.lostRevenue);
  const suppliers = Array.from(supplierMap.values()).sort((a, b) => b.lostRevenue - a.lostRevenue);
  const managersStats = Array.from(managerMap.values()).sort((a, b) => b.lostRevenue - a.lostRevenue);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Аналитика отказов и отмен</h1>
            <p className="mt-1 text-sm text-slate-500">Потерянная выручка и проблемные позиции</p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="text-sm text-red-700">Потерянная выручка</div>
                <div className="mt-2 text-3xl font-bold text-red-700">
                  {Math.round(totalLostRevenue).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-red-700">Из-за отмененных и отказных позиций</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отменили клиенты</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{clientCancelsCount}</div>
                <div className="mt-1 text-xs text-slate-500">Позиций отменено покупателями (шт.)</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отказы поставщиков / магазина</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{supplierCancelsCount}</div>
                <div className="mt-1 text-xs text-slate-500">Не привезли, нет в наличии, брак (шт.)</div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Проблемные бренды */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">Проблемные бренды</h2>
                  <p className="text-xs text-slate-500 mt-1">Откуда чаще всего идут отказы и отмены</p>
                </div>
                {brands.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">Нет отмен по брендам.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="px-4 py-3 font-medium">Бренд</th>
                          <th className="px-4 py-3 font-medium">Отменено шт.</th>
                          <th className="px-4 py-3 font-medium">Потеряно</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brands.slice(0, 10).map((b) => (
                          <tr key={b.name} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{b.name}</td>
                            <td className="px-4 py-3 text-slate-700">{b.count}</td>
                            <td className="px-4 py-3 font-medium text-red-600">{Math.round(b.lostRevenue).toLocaleString("ru-RU")} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Проблемные поставщики */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">Проблемные поставщики</h2>
                  <p className="text-xs text-slate-500 mt-1">Кто срывает сроки или бракует товар</p>
                </div>
                {suppliers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">Нет отказов по поставщикам.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="px-4 py-3 font-medium">Поставщик</th>
                          <th className="px-4 py-3 font-medium">Отказов шт.</th>
                          <th className="px-4 py-3 font-medium">Потеряно</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.slice(0, 10).map((s) => (
                          <tr key={s.name} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{s.name}</td>
                            <td className="px-4 py-3 text-slate-700">{s.count}</td>
                            <td className="px-4 py-3 font-medium text-red-600">{Math.round(s.lostRevenue).toLocaleString("ru-RU")} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Менеджеры с наибольшим числом отмен */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Отмены по менеджерам</h2>
                <p className="text-xs text-slate-500 mt-1">У кого клиентов чаще всего отменяют заказы</p>
              </div>
              {managersStats.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Нет отмен по менеджерам.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Менеджер</th>
                        <th className="px-4 py-3 font-medium">Отмен/Отказов шт.</th>
                        <th className="px-4 py-3 font-medium">Потеряно выручки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managersStats.slice(0, 10).map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <Link href={"/manager/" + m.id} className="hover:text-blue-600">
                              {getManagerName(m.id, managers)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{m.count}</td>
                          <td className="px-4 py-3 font-medium text-red-600">{Math.round(m.lostRevenue).toLocaleString("ru-RU")} ₽</td>
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