
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type OrderPosition = {
  numberFix: string;
  brandFix: string;
  description: string;
  priceOut: number;
  quantity: string;
  quantityFinal: string;
  isCanceled: string;
};

type Order = {
  number: string;
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

export default async function AbcAnalysisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "this_month";
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders(period, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Агрегируем данные по артикулам
  const articleMap = new Map<string, { article: string; brand: string; name: string; qty: number; revenue: number }>();

  for (const order of orders) {
    if (!order.positions) continue;

    for (const pos of order.positions) {
      if (pos.isCanceled === "1") continue;

      const article = pos.numberFix || "БЕЗ АРТИКУЛА";
      const key = `${article}_${pos.brandFix}`;
      const qty = Number(pos.quantityFinal || pos.quantity || 0);
      const priceOut = Number(pos.priceOut || 0);
      const revenue = priceOut * qty;

      if (revenue <= 0) continue;

      const existing = articleMap.get(key);
      if (existing) {
        existing.qty += qty;
        existing.revenue += revenue;
      } else {
        articleMap.set(key, {
          article,
          brand: pos.brandFix || "—",
          name: pos.description || "Без названия",
          qty,
          revenue,
        });
      }
    }
  }

  // Сортируем по убыванию выручки
  const sortedArticles = Array.from(articleMap.values()).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sortedArticles.reduce((sum, a) => sum + a.revenue, 0);
  const totalQty = sortedArticles.reduce((sum, a) => sum + a.qty, 0);
  const totalArticles = sortedArticles.length;

  // Распределение по группам ABC
  let cumRevenue = 0;
  let aCount = 0, bCount = 0, cCount = 0;
  let aRev = 0, bRev = 0, cRev = 0;

  const analyzedArticles = sortedArticles.map((a) => {
    cumRevenue += a.revenue;
    const cumPercent = (cumRevenue / totalRevenue) * 100;

    let category = "C";
    if (cumPercent <= 80) {
      category = "A";
      aCount++; aRev += a.revenue;
    } else if (cumPercent <= 95) {
      category = "B";
      bCount++; bRev += a.revenue;
    } else {
      cCount++; cRev += a.revenue;
    }

    return {
      ...a,
      revPercent: (a.revenue / totalRevenue) * 100,
      cumPercent,
      category,
    };
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ABC-анализ ассортимента</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ранжирование товаров по их вкладу в выручку
            </p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            {/* Сводка по группам */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm font-semibold text-green-700">Группа A (Золотые изделия)</div>
                <div className="mt-2 text-2xl font-bold text-green-700">{aCount} артикулов</div>
                <div className="text-xs text-green-700 mt-1">
                  {totalArticles > 0 ? ((aCount / totalArticles) * 100).toFixed(1) : 0}% ассортимента = {Math.round(aRev).toLocaleString("ru-RU")} ₽ выручки
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="text-sm font-semibold text-blue-700">Группа B (Средние)</div>
                <div className="mt-2 text-2xl font-bold text-blue-700">{bCount} артикулов</div>
                <div className="text-xs text-blue-700 mt-1">
                  {totalArticles > 0 ? ((bCount / totalArticles) * 100).toFixed(1) : 0}% ассортимента = {Math.round(bRev).toLocaleString("ru-RU")} ₽ выручки
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-500">Группа C (Балласт)</div>
                <div className="mt-2 text-2xl font-bold text-slate-500">{cCount} артикулов</div>
                <div className="text-xs text-slate-500 mt-1">
                  {totalArticles > 0 ? ((cCount / totalArticles) * 100).toFixed(1) : 0}% ассортимента = {Math.round(cRev).toLocaleString("ru-RU")} ₽ выручки
                </div>
              </div>
            </div>

            {/* Таблица ассортимента */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Рейтинг товаров (Топ-100)</h2>
                <p className="text-xs text-slate-500 mt-1">Отсортировано по выручке. Группа A приносит 80% денег, Группа C - только 5%</p>
              </div>
              {analyzedArticles.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Нет данных для анализа за этот период.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Группа</th>
                        <th className="px-4 py-3 font-medium">Артикул</th>
                        <th className="px-4 py-3 font-medium">Бренд</th>
                        <th className="px-4 py-3 font-medium">Название</th>
                        <th className="px-4 py-3 font-medium">Шт.</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">% выручки</th>
                        <th className="px-4 py-3 font-medium">Накопит. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzedArticles.slice(0, 100).map((a, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                              a.category === "A" ? "bg-green-500" : 
                              a.category === "B" ? "bg-blue-500" : "bg-slate-300"
                            }`}>
                              {a.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-blue-600">{a.article}</td>
                          <td className="px-4 py-3 text-slate-700">{a.brand}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{a.name}</td>
                          <td className="px-4 py-3 text-slate-700">{a.qty}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">{Math.round(a.revenue).toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3 text-slate-500">{a.revPercent.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{a.cumPercent.toFixed(1)}%</td>
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