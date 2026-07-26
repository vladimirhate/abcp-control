import { abcpRequest, formatDate, calcOrderMargin, OrderPosition } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  userId: string;
  userName: string;
  userFullName: string;
  debt: number;
  positions?: OrderPosition[];
};

async function getOrders(): Promise<Order[]> {
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 30);
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

export default async function ClientsPage() {
  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const clientMap = new Map<
    string,
    {
      name: string;
      ordersCount: number;
      revenue: number;
      margin: number;
      debt: number;
    }
  >();

  for (const order of orders) {
    const id = order.userId || "0";
    if (id === "0") continue; // Пропускаем гостей без ID

    const name = order.userFullName || order.userName || "Клиент " + id;
    const orderMargin = calcOrderMargin(order.positions);
    const sum = Number(order.sum || 0);
    const debt = Number(order.debt || 0);

    const existing = clientMap.get(id);
    if (existing) {
      existing.ordersCount += 1;
      existing.revenue += sum;
      existing.margin += orderMargin;
      existing.debt += debt;
    } else {
      clientMap.set(id, {
        name,
        ordersCount: 1,
        revenue: sum,
        margin: orderMargin,
        debt: debt,
      });
    }
  }

  const clients = Array.from(clientMap.values()).map((c) => ({
    ...c,
    marginPercent: c.revenue > 0 ? (c.margin / c.revenue) * 100 : 0,
  }));

  // Сортируем по выручке
  clients.sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = clients.reduce((sum, c) => sum + c.revenue, 0);
  const totalMargin = clients.reduce((sum, c) => sum + c.margin, 0);
  const totalDebt = clients.reduce((sum, c) => sum + c.debt, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Клиенты</h1>
          <p className="mt-1 text-sm text-slate-500">
            Топ клиентов и должников за последние 30 дней
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего клиентов</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {clients.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalRevenue).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Маржа</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="text-sm text-red-700">Задолженность</div>
                <div className="mt-2 text-3xl font-bold text-red-700">
                  {Math.round(totalDebt).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Топ клиентов</h2>
              </div>

              {clients.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Нет данных по клиентам за этот период.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Заказов</th>
                        <th className="px-4 py-3 font-medium">Выручка</th>
                        <th className="px-4 py-3 font-medium">Маржа</th>
                        <th className="px-4 py-3 font-medium">Маржин.</th>
                        <th className="px-4 py-3 font-medium">Долг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.slice(0, 100).map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.ordersCount}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {Math.round(c.revenue).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className={`px-4 py-3 font-medium ${c.margin < 0 ? "text-red-600" : "text-green-700"}`}>
                            {Math.round(c.margin).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${
                              c.marginPercent >= 15 ? "text-green-700" :
                              c.marginPercent >= 5 ? "text-amber-600" :
                              "text-red-600"
                            }`}>
                              {c.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-medium ${c.debt > 0 ? "text-red-600" : "text-slate-500"}`}>
                            {c.debt > 0 ? Math.round(c.debt).toLocaleString("ru-RU") + " ₽" : "—"}
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