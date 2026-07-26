import Link from "next/link";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

type OrderPosition = {
  id: string;
  brand: string;
  number: string;
  description: string;
  quantity: string;
  quantityFinal: string;
  priceIn: number;
  priceOut: number;
  status: string;
  isCanceled: string;
  distributorName: string;
};

type Order = {
  number: string;
  date: string;
  sum: number;
  paid: boolean;
  userName: string;
  userFullName: string;
  managerId: string;
  paymentType: string | null;
  deliveryType: string | null;
  deliveryAddress: string;
  deliveryOffice: string | null;
  comment: string;
  positions?: OrderPosition[];
};

async function getOrder(number: string): Promise<Order | null> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  // Формируем параметры запроса
  const searchParams = new URLSearchParams({
    userlogin: shop.api_login,
    userpsw: shop.api_password_md5,
  });
  // ABCP требует массив для номеров заказов
  searchParams.append("numbers[]", number);

  const url = `${shop.api_url}/cp/orders?${searchParams.toString()}`;
  console.log("Запрос заказа:", url);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Ошибка API: ${response.status}`);
  }

  const data = await response.json();
  return data && data.length > 0 ? data[0] : null;
}

type PageProps = {
  params: Promise<{ number: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { number } = await params;

  let order: Order | null = null;
  let error: string | null = null;

  try {
    order = await getOrder(number);
    if (!order) error = "Заказ не найден";
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const totalMargin = order?.positions?.reduce((sum, pos) => {
    if (pos.isCanceled === "1") return sum;
    const qty = Number(pos.quantityFinal || pos.quantity || 0);
    return sum + (Number(pos.priceOut || 0) - Number(pos.priceIn || 0)) * qty;
  }, 0) || 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <Link href="/orders" className="text-sm text-slate-500 hover:text-blue-600">
            ← Назад к заказам
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Заказ № {number}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            От {order?.date || "—"}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка: {error}
          </div>
        ) : order ? (
          <>
            {/* Информация о заказе */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Сумма заказа</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {Number(order.sum || 0).toLocaleString("ru-RU")} ₽
                </div>
                <div className={`mt-1 text-xs font-medium ${order.paid ? "text-green-600" : "text-amber-600"}`}>
                  {order.paid ? "Оплачен" : "Не оплачен"}
                </div>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Маржа заказа</div>
                <div className="mt-2 text-2xl font-bold text-green-700">
                  {Math.round(totalMargin).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-green-700">
                  {order.sum > 0 ? ((totalMargin / Number(order.sum)) * 100).toFixed(1) : 0}% маржинальность
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Оплата</div>
                <div className="mt-2 text-base font-medium text-slate-900">
                  {order.paymentType || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Доставка</div>
                <div className="mt-2 text-base font-medium text-slate-900">
                  {order.deliveryType || "—"}
                </div>
                <div className="mt-1 text-xs text-slate-500 truncate">
                  {order.deliveryAddress || order.deliveryOffice || ""}
                </div>
              </div>
            </div>

            {/* Клиент и комментарий */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500">Клиент</h3>
                <div className="mt-2 text-base font-medium text-slate-900">
                  {order.userFullName || order.userName || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500">Комментарий к заказу</h3>
                <div className="mt-2 text-sm text-slate-700">
                  {order.comment || "Нет комментария"}
                </div>
              </div>
            </div>

            {/* Позиции заказа */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Позиции ({order.positions?.length || 0})</h2>
              </div>
              
              {(!order.positions || order.positions.length === 0) ? (
                <div className="p-6 text-center text-slate-500">В заказе нет позиций</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Бренд</th>
                        <th className="px-4 py-3 font-medium">Артикул</th>
                        <th className="px-4 py-3 font-medium">Наименование</th>
                        <th className="px-4 py-3 font-medium">Поставщик</th>
                        <th className="px-4 py-3 font-medium">Шт.</th>
                        <th className="px-4 py-3 font-medium">Закупка</th>
                        <th className="px-4 py-3 font-medium">Продажа</th>
                        <th className="px-4 py-3 font-medium">Маржа</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.positions.map((pos) => {
                        const qty = Number(pos.quantityFinal || pos.quantity || 0);
                        const priceIn = Number(pos.priceIn || 0);
                        const priceOut = Number(pos.priceOut || 0);
                        const margin = (priceOut - priceIn) * qty;
                        const canceled = pos.isCanceled === "1";

                        return (
                          <tr key={pos.id} className={`border-b border-slate-100 hover:bg-slate-50 ${canceled ? "opacity-50 line-through" : ""}`}>
                            <td className="px-4 py-3 font-medium text-slate-900">{pos.brand}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium">{pos.number}</td>
                            <td className="px-4 py-3 text-slate-700 max-w-xs">{pos.description || "—"}</td>
                            <td className="px-4 py-3 text-slate-700">{pos.distributorName || "—"}</td>
                            <td className="px-4 py-3 text-slate-700">{qty}</td>
                            <td className="px-4 py-3 text-slate-500">{priceIn.toLocaleString("ru-RU")} ₽</td>
                            <td className="px-4 py-3 text-slate-900 font-medium">{priceOut.toLocaleString("ru-RU")} ₽</td>
                            <td className={`px-4 py-3 font-medium ${margin < 0 ? "text-red-600" : "text-green-700"}`}>
                              {Math.round(margin).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{pos.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}