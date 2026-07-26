import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  userName: string;
  date: string;
  dateUpdated: string;
  positionsQuantity: number;
  managerId: string;
};

async function getOrders(): Promise<Order[]> {
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 30);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date();
  dateEnd.setHours(23, 59, 59, 0);

  const data = await abcpRequest<Order[]>("cp/orders", {
    dateCreatedStart: formatDate(dateStart),
    dateCreatedEnd: formatDate(dateEnd),
    limit: "1000",
  });

  return data;
}

export default async function DashboardPage() {
  let orders: Order[] = [];
  let error: string | null = null;

  try {
    orders = await getOrders();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.sum || 0),
    0
  );
  const paidOrders = orders.filter((order) => order.paid).length;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
          <Link
            href="/api-test"
            className="text-sm text-slate-400 hover:text-white"
          >
            API test
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold">Дашборд собственника</h1>
        <p className="mt-2 text-slate-400">
          Реальные данные из ABCP за последние 30 дней
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-300">
            Ошибка: {error}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Заказов</div>
                <div className="mt-2 text-3xl font-bold">{totalOrders}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Выручка</div>
                <div className="mt-2 text-3xl font-bold">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Оплачено</div>
                <div className="mt-2 text-3xl font-bold text-green-400">
                  {paidOrders}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Средний чек</div>
                <div className="mt-2 text-3xl font-bold">
                  {Math.round(avgCheck).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-6 py-4">
                <h2 className="font-semibold">Заказы за 30 дней</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">№ заказа</th>
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Сумма</th>
                      <th className="px-4 py-3 font-medium">Позиций</th>
                      <th className="px-4 py-3 font-medium">Оплачен</th>
                      <th className="px-4 py-3 font-medium">Обновлён</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.number}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 font-medium text-blue-400">
                          {order.number}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {order.userName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {order.managerId || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {order.positionsQuantity}
                        </td>
                        <td className="px-4 py-3">
                          {order.paid ? (
                            <span className="text-green-400">Да</span>
                          ) : (
                            <span className="text-amber-400">Нет</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {order.dateUpdated}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}