import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

type OrderPosition = {
  distributorName: string;
  priceIn: number;
  priceOut: number;
  quantity: string;
  quantityFinal: string;
  isCanceled: string;
};

type Order = {
  number: string;
  date: string;
  positions?: OrderPosition[];
};

async function getOrders(): Promise<Order[]> {
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 30); // За последние 30 дней
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

export default async function SuppliersPage() {
  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Агрегация данных по поставщикам
  const supplierMap = new Map<
    string,
    {
      name: string;
      itemsCount: number;
      revenue: number;
      margin: number;
      ordersCount: Set<string>;
    }
  >();

  for (const order of orders) {
    if (!order.positions) continue;

    for (const pos of order.positions) {
      // Пропускаем отменённые позиции
      if (pos.isCanceled === "1") continue;

      const name = pos.distributorName || "Неизвестный поставщик";
      const qty = Number(pos.quantityFinal || pos.quantity || 0);
      const priceIn = Number(pos.priceIn || 0);
      const priceOut = Number(pos.priceOut || 0);

      const itemRevenue = priceOut * qty;
      const itemMargin = (priceOut - priceIn) * qty;

      const existing = supplierMap.get(name);
      if (existing) {
        existing.itemsCount += qty;
        existing.revenue += itemRevenue;
        existing.margin += itemMargin;
        existing.ordersCount.add(order.number);
      } else {
        supplierMap.set(name, {
          name,
          itemsCount: qty,
          revenue: itemRevenue,
          margin: itemMargin,
          ordersCount: new Set([order.number]),
        });
      }
    }
  }

  const suppliers = Array.from(supplierMap.values()).map((s) => ({
    ...s,
    ordersCount: s.ordersCount.size,
    marginPercent: s.revenue > 0 ? (s.margin / s.revenue) * 100 : 0,
  }));

  // Сортируем по выручке (от большего к меньшему)
  suppliers.sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = suppliers.reduce((sum, s) => sum + s.revenue, 0);
  const totalMargin = suppliers.reduce((sum, s) => sum + s.margin, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Поставщики</h1>
          <p className="mt-1 text-sm text-slate-500">
            Аналитика за последние 30 дней
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего поставщиков</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {suppliers.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Общая выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalRevenue).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Общая маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Рейтинг поставщиков</h2>
              </div>

              {suppliers.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Нет данных по поставщикам за этот период.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Поставщик</th>
                        <th className="px-4 py-3 font-medium">Заказов</th>
                        <th className="px-4 py-3 font-medium">Позиций</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Маржа</th>
                        <th className="px-4 py-3 font-medium">Маржинальность</th>
                        <th className="px-4 py-3 font-medium">Доля выручки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((s) => (
                        <tr key={s.name} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {s.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{s.ordersCount}</td>
                          <td className="px-4 py-3 text-slate-700">{s.itemsCount}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {Math.round(s.revenue).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className={`px-4 py-3 font-medium ${s.margin < 0 ? "text-red-600" : "text-green-700"}`}>
                            {Math.round(s.margin).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${
                              s.marginPercent >= 15 ? "text-green-700" :
                              s.marginPercent >= 5 ? "text-amber-600" :
                              "text-red-600"
                            }`}>
                              {s.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {totalRevenue > 0 ? ((s.revenue / totalRevenue) * 100).toFixed(1) : 0}%
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