import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type OrderPosition = {
  numberFix: string;
  description: string;
  brandFix: string;
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

type PageProps = {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
};

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last7";
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders(period, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const articleMap = new Map<string, { article: string; description: string; brand: string; itemsCount: number; revenue: number; margin: number; ordersCount: Set<string> }>();

  for (const order of orders) {
    if (!order.positions) continue;

    for (const pos of order.positions) {
      if (pos.isCanceled === "1") continue;
      const article = pos.numberFix || "БЕЗ АРТИКУЛА";
      const description = pos.description || "Без названия";
      const brand = pos.brandFix || "—";
      
      const qty = Number(pos.quantityFinal || pos.quantity || 0);
      const priceIn = Number(pos.priceIn || 0);
      const priceOut = Number(pos.priceOut || 0);

      const itemRevenue = priceOut * qty;
      const itemMargin = (priceOut - priceIn) * qty;

      const existing = articleMap.get(article + brand);
      if (existing) {
        existing.itemsCount += qty;
        existing.revenue += itemRevenue;
        existing.margin += itemMargin;
        existing.ordersCount.add(order.number);
      } else {
        articleMap.set(article + brand, { article, description, brand, itemsCount: qty, revenue: itemRevenue, margin: itemMargin, ordersCount: new Set([order.number]) });
      }
    }
  }

  const articles = Array.from(articleMap.values()).map((a) => ({
    ...a,
    ordersCount: a.ordersCount.size,
    marginPercent: a.revenue > 0 ? (a.margin / a.revenue) * 100 : 0,
  }));

  articles.sort((a, b) => b.itemsCount - a.itemsCount);

  const totalRevenue = articles.reduce((sum, a) => sum + a.revenue, 0);
  const totalMargin = articles.reduce((sum, a) => sum + a.margin, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Артикулы</h1>
            <p className="mt-1 text-sm text-slate-500">Хиты продаж за выбранный период</p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Уникальных артикулов</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{articles.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Общая выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{Math.round(totalRevenue).toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Общая маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">{Math.round(totalMargin).toLocaleString("ru-RU")} ₽</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Хиты продаж (Топ-100)</h2>
              </div>
              {articles.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Нет данных по артикулам за этот период.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Артикул</th>
                        <th className="px-4 py-3 font-medium">Бренд</th>
                        <th className="px-4 py-3 font-medium">Название</th>
                        <th className="px-4 py-3 font-medium">Шт.</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Маржа</th>
                        <th className="px-4 py-3 font-medium">Маржин.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.slice(0, 100).map((a) => (
                        <tr key={a.article + a.brand} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">{a.article}</td>
                          <td className="px-4 py-3 text-slate-700">{a.brand}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{a.description}</td>
                          <td className="px-4 py-3 text-slate-700">{a.itemsCount}</td>
                          <td className="px-4 py-3 text-slate-700">{Math.round(a.revenue).toLocaleString("ru-RU")} ₽</td>
                          <td className={`px-4 py-3 font-medium ${a.margin < 0 ? "text-red-600" : "text-green-700"}`}>{Math.round(a.margin).toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${a.marginPercent >= 15 ? "text-green-700" : a.marginPercent >= 5 ? "text-amber-600" : "text-red-600"}`}>
                              {a.marginPercent.toFixed(1)}%
                            </span>
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