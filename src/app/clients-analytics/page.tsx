import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import Link from "next/link";

type Order = {
  number: string;
  sum: number;
  date: string;
  userId: string;
  userName: string;
  userFullName: string;
};

type User = {
  userId: string;
  name: string;
  organizationName: string;
  registrationDate: string;
};

async function getOrders(): Promise<Order[]> {
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 90);
  dateStart.setHours(0, 0, 0, 0);

  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Order[]>(
    "cp/orders",
    {
      dateCreatedStart: formatDate(dateStart),
      dateCreatedEnd: formatDate(new Date()),
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

  // Берем клиентов, обновленных за последние 90 дней
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 90);
  dateStart.setHours(0, 0, 0, 0);

  return abcpRequest<User[]>(
    "cp/users",
    {
      dateUpdatedStart: formatDate(dateStart),
      limit: "1000",
    },
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

function getClientName(user: User): string {
  return user.organizationName || user.name || "Клиент " + user.userId;
}

export default async function ClientsAnalyticsPage() {
  let orders: Order[] = [];
  let users: User[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([getOrders(), getUsers()]);
    orders = results[0];
    users = results[1];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Группируем заказы по клиентам
  const clientOrdersMap = new Map<string, { dates: string[]; totalSum: number }>();

  for (const order of orders) {
    const id = order.userId;
    if (!id || id === "0") continue;

    const existing = clientOrdersMap.get(id);
    if (existing) {
      existing.dates.push(order.date);
      existing.totalSum += Number(order.sum || 0);
    } else {
      clientOrdersMap.set(id, { dates: [order.date], totalSum: Number(order.sum || 0) });
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Новички без покупок (зарегистрировались > 7 дней назад, но заказов нет)
  const newWithoutOrders = users.filter(u => {
    if (!u.registrationDate) return false;
    const regDate = new Date(u.registrationDate.replace(" ", "T"));
    return regDate < thirtyDaysAgo && !clientOrdersMap.has(u.userId);
  });

  // 2. Уходящие клиенты (были заказы, но последний заказ был > 30 дней назад)
  const churnedClients = Array.from(clientOrdersMap.entries())
    .map(([id, data]) => {
      const lastOrderDate = new Date(Math.max(...data.dates.map(d => new Date(d.replace(" ", "T")).getTime())));
      return { id, data, lastOrderDate };
    })
    .filter(item => item.lastOrderDate < thirtyDaysAgo)
    .map(item => ({
      id: item.id,
      name: getClientName(users.find(u => u.userId === item.id) || { userId: item.id, name: "ID: " + item.id, organizationName: "", registrationDate: "" }),
      lastOrderDate: item.lastOrderDate,
      totalSum: item.data.totalSum,
      ordersCount: item.data.dates.length,
    }))
    .sort((a, b) => b.totalSum - a.totalSum); // Сортируем по выручке (VIP сверху)

  // 3. Снижение активности (заказы были в первые 45 дней периода, но не было в последние 45 дней)
  const fortyFiveDaysAgo = new Date(now);
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  const decliningClients = Array.from(clientOrdersMap.entries())
    .map(([id, data]) => {
      const hasEarlyOrders = data.dates.some(d => new Date(d.replace(" ", "T")) < fortyFiveDaysAgo);
      const hasLateOrders = data.dates.some(d => new Date(d.replace(" ", "T")) >= fortyFiveDaysAgo);
      return { id, data, hasEarlyOrders, hasLateOrders };
    })
    .filter(item => item.hasEarlyOrders && !item.hasLateOrders)
    .map(item => ({
      id: item.id,
      name: getClientName(users.find(u => u.userId === item.id) || { userId: item.id, name: "ID: " + item.id, organizationName: "", registrationDate: "" }),
      totalSum: item.data.totalSum,
      ordersCount: item.data.dates.length,
    }))
    .sort((a, b) => b.totalSum - a.totalSum);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Аналитика клиентов</h1>
          <p className="mt-1 text-sm text-slate-500">
            Retention, отток и снижение активности за 90 дней
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Новички без покупок</div>
                <div className="mt-2 text-3xl font-bold text-amber-600">{newWithoutOrders.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Уходящие клиенты (30+ дней)</div>
                <div className="mt-2 text-3xl font-bold text-red-600">{churnedClients.length}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Снизили активность</div>
                <div className="mt-2 text-3xl font-bold text-orange-600">{decliningClients.length}</div>
              </div>
            </div>

            {/* Уходящие VIP */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Уходящие клиенты (отсортированы по выручке)</h2>
                <p className="text-xs text-slate-500 mt-1">Не заказывали более 30 дней. Звоните им в первую очередь!</p>
              </div>
              {churnedClients.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Оттока клиентов нет.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Заказов (за 90д)</th>
                        <th className="px-4 py-3 font-medium">Выручка (за 90д)</th>
                        <th className="px-4 py-3 font-medium">Последний заказ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churnedClients.slice(0, 20).map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.ordersCount}</td>
                          <td className="px-4 py-3 text-slate-700">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3 text-red-600 font-medium">
                            {c.lastOrderDate.toLocaleDateString("ru-RU")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Снижение активности */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Снижение активности</h2>
                <p className="text-xs text-slate-500 mt-1">Заказывали в начале периода, но перестали в последние 45 дней</p>
              </div>
              {decliningClients.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Все клиенты активны.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Выручка (за 90д)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decliningClients.slice(0, 20).map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{c.name}</td>
                          <td className="px-4 py-3 text-slate-700">{Math.round(c.totalSum).toLocaleString("ru-RU")} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Новички без покупок */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Новички без покупок</h2>
                <p className="text-xs text-slate-500 mt-1">Зарегистрировались более 30 дней назад, но так ничего и не заказали</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {newWithoutOrders.slice(0, 20).map((u) => (
                        <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{getClientName(u)}</td>
                          <td className="px-4 py-3 text-slate-500">{u.registrationDate}</td>
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