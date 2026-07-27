import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop, getAlertsSettings } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type OrderPosition = {
  isCanceled: string;
  statusCode: string;
};

type Order = {
  number: string;
  sum: number;
  date: string;
  userId: string;
  userName: string;
  userFullName: string;
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

export default async function ClientsAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last6months";
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders(period, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Получаем настройки статусов отказов клиентов
  const shop = await getShop();
  const settings = shop ? await getAlertsSettings(shop.id) : null;
  const clientCancelCodes = settings?.client_cancel_statuses || [];

  const clientMap = new Map<string, { 
    name: string; 
    ordersCount: number; 
    totalSum: number; 
    canceledCount: number; 
    totalItems: number;
  }>();

  for (const order of orders) {
    const id = order.userId || "0";
    if (!id || id === "0") continue;

    const name = order.userFullName || order.userName || "Клиент " + id;
    const sum = Number(order.sum || 0);
    let totalItems = 0;
    let canceledItems = 0;

    if (order.positions) {
      for (const pos of order.positions) {
        const isCancel = pos.isCanceled === "1" || pos.isCanceled === "2" || clientCancelCodes.includes(Number(pos.statusCode));
        totalItems++;
        if (isCancel) canceledItems++;
      }
    }

    const existing = clientMap.get(id);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSum += sum;
      existing.canceledCount += canceledItems;
      existing.totalItems += totalItems;
    } else {
      clientMap.set(id, { name, ordersCount: 1, totalSum: sum, canceledCount: canceledItems, totalItems: totalItems });
    }
  }

  const clients = Array.from(clientMap.entries()).map(([id, data]) => {
    const cancelRate = data.totalItems > 0 ? (data.canceledCount / data.totalItems) * 100 : 0;
    
    let rating = "C";
    let recommendation = "Стандартный клиент. Работаем в обычном режиме.";
    let ratingColor = "bg-slate-100 text-slate-600";

    if (data.totalSum > 100000 && cancelRate < 10) {
      rating = "A";
      recommendation = "VIP-клиент. Можно предложить персональную скидку.";
      ratingColor = "bg-green-100 text-green-700";
    } else if (data.totalSum > 30000 && cancelRate < 20) {
      rating = "B";
      recommendation = "Хороший клиент. Растущий потенциал.";
      ratingColor = "bg-blue-100 text-blue-700";
    } else if (cancelRate > 30) {
      rating = "D";
      recommendation = "🔴 Токсичный клиент. Много возвратов. Стоит изменить профиль или условия.";
      ratingColor = "bg-red-100 text-red-700";
    } else if (data.totalSum < 5000) {
      rating = "C";
      recommendation = "Низкая активность. Предложить акцию?";
      ratingColor = "bg-amber-100 text-amber-700";
    }

    return {
      id,
      ...data,
      cancelRate,
      rating,
      recommendation,
      ratingColor,
    };
  });

  clients.sort((a, b) => {
    if (a.rating === "D" && b.rating !== "D") return -1;
    if (b.rating === "D" && a.rating !== "D") return 1;
    return b.totalSum - a.totalSum;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Рейтинг клиентов</h1>
            <p className="mt-1 text-sm text-slate-500">
              Оценка клиентов на основе выручки и процента возвратов/отказов
            </p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Список клиентов ({clients.length})</h2>
            </div>
            {clients.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Нет данных за этот период.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Рейтинг</th>
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Выручка</th>
                      <th className="px-4 py-3 font-medium">Заказов</th>
                      <th className="px-4 py-3 font-medium">Возвраты/Отказы</th>
                      <th className="px-4 py-3 font-medium">Рекомендация системы</th>
                      <th className="px-4 py-3 font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.slice(0, 100).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${c.ratingColor}`}>
                            {c.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{c.name}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3 text-slate-700">{c.ordersCount}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${c.cancelRate > 30 ? "text-red-600" : c.cancelRate > 15 ? "text-amber-600" : "text-green-700"}`}>
                            {c.cancelRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">{c.recommendation}</td>
                        <td className="px-4 py-3">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                            + Задача
                          </button>
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