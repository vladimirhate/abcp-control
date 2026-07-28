import Link from "next/link";
import { abcpRequest, formatDate, calcOrderMargin, OrderPosition } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { getRange } from "@/lib/dates";

type Order = {
  number: string;
  sum: number;
  paid: boolean;
  userName: string;
  date: string;
  dateUpdated: string;
  positionsQuantity: number;
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

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "last7";
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Заказы</h1>
            <p className="mt-1 text-sm text-slate-500">История заказов по выбранному периоду</p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Всего заказов: {orders.length}</h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Заказов за этот период нет.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">№ заказа</th>
                      <th className="px-4 py-3 font-medium">Дата</th>
                      <th className="px-4 py-3 font-medium">Клиент</th>
                      <th className="px-4 py-3 font-medium">Менеджер</th>
                      <th className="px-4 py-3 font-medium">Сумма</th>
                      <th className="px-4 py-3 font-medium">Маржа</th>
                      <th className="px-4 py-3 font-medium">Оплачен</th>
                      <th className="px-4 py-3 font-medium">Позиций</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const margin = calcOrderMargin(order.positions);
                      return (
                        <tr key={order.number} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">
                            <Link href={"/order/" + order.number} className="hover:underline">{order.number}</Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{order.date}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{order.userName || "—"}</td>
                          <td className="px-4 py-3">
                            <Link href={"/manager/" + (order.managerId || "0")} className="text-slate-700 hover:text-blue-600">
                              {getManagerName(order.managerId, managers)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{Number(order.sum || 0).toLocaleString("ru-RU")} ₽</td>
                          <td className={`px-4 py-3 font-medium whitespace-nowrap ${margin < 0 ? "text-red-600" : "text-green-700"}`}>
                            {Math.round(margin).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">
                            {order.paid ? <span className="text-green-600 font-medium">Да</span> : <span className="text-amber-600 font-medium">Нет</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{order.positionsQuantity}</td>
                        </tr>
                      );
                    })}
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