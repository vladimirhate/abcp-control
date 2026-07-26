import Link from "next/link";
import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

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

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  typeName: string;
  officeName: string;
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

async function getManagers(): Promise<Manager[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Manager[]>(
    "cp/managers",
    {},
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerPage({ params }: PageProps) {
  const { id } = await params;

  let orders: Order[] = [];
  let managers: Manager[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.all([getOrders(), getManagers()]);
    orders = results[0];
    managers = results[1];
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const manager = managers.find((m) => m.id === id);
  const managerOrders = orders.filter((o) => (o.managerId || "0") === id);

  const managerName = manager
    ? (manager.firstName + " " + manager.lastName).trim() || manager.email
    : id === "0"
      ? "Без менеджера"
      : "ID: " + id;

  const totalOrders = managerOrders.length;
  const totalRevenue = managerOrders.reduce(
    (sum, o) => sum + Number(o.sum || 0),
    0
  );
  const paidOrders = managerOrders.filter((o) => o.paid).length;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-blue-600"
          >
            ← К дашборду
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{managerName}</h1>
          {manager && (
            <p className="mt-1 text-sm text-slate-500">
              {manager.typeName} · {manager.officeName}
              {manager.email && " · " + manager.email}
              {manager.phone && " · " + manager.phone}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Данные за последние 30 дней
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
                <div className="text-sm text-slate-500">Заказов</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Выручка</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {totalRevenue.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Оплачено</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {paidOrders}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Средний чек</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(avgCheck).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Заказы менеджера</h2>
              </div>

              {managerOrders.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  У этого менеджера нет заказов за выбранный период
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">№ заказа</th>
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Сумма</th>
                        <th className="px-4 py-3 font-medium">Позиций</th>
                        <th className="px-4 py-3 font-medium">Оплачен</th>
                        <th className="px-4 py-3 font-medium">Обновлён</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managerOrders.map((order) => (
                        <tr key={order.number} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">{order.number}</td>
                          <td className="px-4 py-3 text-slate-700">{order.userName || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-700">{order.positionsQuantity}</td>
                          <td className="px-4 py-3">
                            {order.paid ? (
                              <span className="text-green-700 font-medium">Да</span>
                            ) : (
                              <span className="text-amber-600 font-medium">Нет</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{order.dateUpdated}</td>
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