import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop, getAlertsSettings } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";
import { CreateTaskButton } from "@/components/CreateTaskButton";

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

type User = {
  userId: string;
  name: string;
  organizationName: string;
  registrationDate: string;
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

async function getUsers(): Promise<User[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  // Загружаем последних 1000 зарегистрированных клиентов
  return abcpRequest<User[]>(
    "cp/users",
    { limit: "1000", desc: "true" },
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

function getClientName(user: User | undefined, id: string, order?: Order): string {
  if (user) return user.organizationName || user.name || "Клиент " + id;
  if (order) return order.userFullName || order.userName || "Клиент " + id;
  return "Клиент " + id;
}

type PageProps = {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
};

export default async function ClientsAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last6months"; // По умолчанию 6 месяцев для анализа оттока
  const from = params?.from;
  const to = params?.to;

  let orders: Order[] = [];
  let users: User[] = [];
  let error: string | null = null;

  try {
    // Загружаем параллельно заказы, пользователей и настройки
    const shop = await getShop();
    if (!shop) throw new Error("Магазин не найден в БД");
    
    const settings = await getAlertsSettings(shop.id);
    const clientCancelCodes = settings?.client_cancel_statuses || [];

    const results = await Promise.all([getOrders(period, from, to), getUsers()]);
    orders = results[0];
    users = results[1];

    const clientMap = new Map<string, { 
      name: string; 
      ordersCount: number; 
      totalSum: number; 
      canceledCount: number; 
      totalItems: number;
      lastOrderDate: Date | null;
      firstOrderDate: Date | null;
    }>();

    // Группируем заказы по клиентам
    for (const order of orders) {
      const id = order.userId || "0";
      if (!id || id === "0") continue;

      const userInfo = users.find(u => u.userId === id);
      const name = getClientName(userInfo, id, order);
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

      const orderDate = new Date(order.date.replace(" ", "T"));
      const existing = clientMap.get(id);
      
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSum += sum;
        existing.canceledCount += canceledItems;
        existing.totalItems += totalItems;
        if (orderDate > (existing.lastOrderDate || new Date(0))) existing.lastOrderDate = orderDate;
        if (orderDate < (existing.firstOrderDate || new Date(9999,0,1))) existing.firstOrderDate = orderDate;
      } else {
        clientMap.set(id, { 
          name, 
          ordersCount: 1, 
          totalSum: sum, 
          canceledCount: canceledItems, 
          totalItems: totalItems,
          lastOrderDate: orderDate,
          firstOrderDate: orderDate
        });
      }
    }

    // 1. Формируем Рейтинг токсичности
    const ratingClients = Array.from(clientMap.entries()).map(([id, data]) => {
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

      return { id, ...data, cancelRate, rating, recommendation, ratingColor };
    });

    ratingClients.sort((a, b) => {
      if (a.rating === "D" && b.rating !== "D") return -1;
      if (b.rating === "D" && a.rating !== "D") return 1;
      return b.totalSum - a.totalSum;
    });

    // 2. Анализ оттока (Уходящие и Снижение активности)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Уходящие VIP (заказывали много, но последний заказ был > 30 дней назад)
    const churnedVip = ratingClients
      .filter(c => c.totalSum > 30000 && c.lastOrderDate && c.lastOrderDate < thirtyDaysAgo)
      .sort((a, b) => b.totalSum - a.totalSum);

    // Снижение активности (заказывали, но последний заказ был > 30 дней назад, выручка средняя)
    const decliningClients = ratingClients
      .filter(c => c.totalSum <= 30000 && c.lastOrderDate && c.lastOrderDate < thirtyDaysAgo)
      .sort((a, b) => b.totalSum - a.totalSum);

    // 3. Новички без покупок (зарегистрировались > 7 дней назад, но заказов нет)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newWithoutOrders = users.filter(u => {
      if (!u.registrationDate) return false;
      const regDate = new Date(u.registrationDate.replace(" ", "T"));
      return regDate < sevenDaysAgo && !clientMap.has(u.userId);
    }).slice(0, 50); // Берем только 50 для отображения

    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Аналитика клиентов</h1>
              <p className="mt-1 text-sm text-slate-500">
                Рейтинг токсичности, отток и снижение активности
              </p>
            </div>
            <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
          </div>

          {/* Блок 1: Рейтинг токсичности */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Рейтинг клиентов ({ratingClients.length})</h2>
              <p className="text-xs text-slate-500 mt-1">Оценка на основе выручки и процента возвратов/отказов</p>
            </div>
            {ratingClients.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Нет данных за этот период.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Рейтинг</th>
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Выручка</th>
                      <th className="px-4 py-3 font-medium">Возвраты</th>
                      <th className="px-4 py-3 font-medium">Рекомендация</th>
                      <th className="px-4 py-3 font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingClients.slice(0, 100).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${c.ratingColor}`}>
                            {c.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{c.name}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${c.cancelRate > 30 ? "text-red-600" : c.cancelRate > 15 ? "text-amber-600" : "text-green-700"}`}>
                            {c.cancelRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">{c.recommendation}</td>
                        <td className="px-4 py-3">
                          <CreateTaskButton clientId={c.id} clientName={c.name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Блок 2: Уходящие VIP */}
            <div className="rounded-xl border border-red-200 bg-white shadow-sm">
              <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                <h2 className="font-semibold text-red-800">Уходящие VIP-клиенты ({churnedVip.length})</h2>
                <p className="text-xs text-red-700 mt-1">Заказывали много, но не делали заказы &gt; 30 дней</p>
              </div>
              {churnedVip.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Оттока VIP нет.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Посл. заказ</th>
                        <th className="px-4 py-3 font-medium">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churnedVip.slice(0, 20).map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{c.name}</td>
                          <td className="px-4 py-3 text-slate-900">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3 text-red-600 text-xs">{c.lastOrderDate?.toLocaleDateString("ru-RU")}</td>
                          <td className="px-4 py-3">
                            <CreateTaskButton clientId={c.id} clientName={c.name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Блок 3: Снижение активности */}
            <div className="rounded-xl border border-amber-200 bg-white shadow-sm">
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
                <h2 className="font-semibold text-amber-800">Снижение активности ({decliningClients.length})</h2>
                <p className="text-xs text-amber-700 mt-1">Перестали заказывать &gt; 30 дней назад</p>
              </div>
              {decliningClients.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Все клиенты активны.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Посл. заказ</th>
                        <th className="px-4 py-3 font-medium">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decliningClients.slice(0, 20).map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{c.name}</td>
                          <td className="px-4 py-3 text-slate-900">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3 text-amber-600 text-xs">{c.lastOrderDate?.toLocaleDateString("ru-RU")}</td>
                          <td className="px-4 py-3">
                            <CreateTaskButton clientId={c.id} clientName={c.name} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Блок 4: Новички без покупок */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Новички без покупок ({newWithoutOrders.length})</h2>
              <p className="text-xs text-slate-500 mt-1">Зарегистрировались &gt; 7 дней назад, но так ничего и не заказали</p>
            </div>
            {newWithoutOrders.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Таких клиентов нет.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Дата регистрации</th>
                      <th className="px-4 py-3 font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newWithoutOrders.map((u) => (
                      <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{getClientName(u, u.userId)}</td>
                        <td className="px-4 py-3 text-slate-500">{u.registrationDate}</td>
                        <td className="px-4 py-3">
                          <CreateTaskButton clientId={u.userId} clientName={getClientName(u, u.userId)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </AppLayout>
    );
  } catch (e) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Аналитика клиентов</h1>
              <p className="mt-1 text-sm text-slate-500">Рейтинг, отток и снижение активности</p>
            </div>
            <PeriodFilter currentPeriod={params?.period || "last6months"} currentFrom={from} currentTo={to} />
          </div>
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {e instanceof Error ? e.message : "Неизвестная ошибка"}
          </div>
        </div>
      </AppLayout>
    );
  }
}