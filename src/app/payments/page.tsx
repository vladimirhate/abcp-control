import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { RevenueChart } from "@/components/RevenueChart";
import { getRange } from "@/lib/dates";

type Payment = {
  paymentId: string;
  paymentType: string;
  paymentTypeCode: string; // 0 - Безналичный, 1 - Электронный, 2 - Наличный
  createDateTime: string;
  amount: number;
  rest: number;
  comment: string;
  userId: string;
};

async function getPayments(period: string, from?: string, to?: string): Promise<Payment[]> {
  const { dateStart, dateEnd } = getRange(period, from, to);
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Payment[]>(
    "cp/finance/payments",
    {
      createDateTimeStart: formatDate(dateStart),
      createDateTimeEnd: formatDate(dateEnd),
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

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params?.period || "this_month";
  const from = params?.from;
  const to = params?.to;

  let payments: Payment[] = [];
  let error: string | null = null;

  try {
    payments = await getPayments(period, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  let totalIncome = 0;
  let cashIncome = 0;
  let cardIncome = 0;
  let bankIncome = 0;
  let stuckMoney = 0;

  const chartMap = new Map<string, { amount: number; time: number }>();
  const stuckPayments: Payment[] = [];

  for (const p of payments) {
    const amount = Number(p.amount || 0);
    // Считаем только приходы (положительные суммы)
    if (amount > 0) {
      totalIncome += amount;

      // Код 2 - Наличный, 1 - Электронный (карта), 0 - Безналичный (счет)
      if (p.paymentTypeCode === "2") cashIncome += amount;
      else if (p.paymentTypeCode === "1") cardIncome += amount;
      else if (p.paymentTypeCode === "0") bankIncome += amount;

      // Группируем для графика
      const dateStr = p.createDateTime.split(" ")[0];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const dateKey = `${day}.${month}`;

        const existing = chartMap.get(dateKey);
        if (existing) {
          existing.amount += amount;
        } else {
          chartMap.set(dateKey, { amount, time: date.getTime() });
        }
      }
    }

    // Ищем зависшие деньги (rest > 0 означает, что часть оплаты не привязана к заказам)
    const rest = Number(p.rest || 0);
    if (rest > 0) {
      stuckMoney += rest;
      stuckPayments.push(p);
    }
  }

  const chartData = Array.from(chartMap.entries())
    .sort((a, b) => a[1].time - b[1].time)
    .map(([date, values]) => ({
      date,
      revenue: Math.round(values.amount),
      margin: 0, // Для графика оплат маржа не нужна, передаем 0
    }));

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Аналитика оплат</h1>
            <p className="mt-1 text-sm text-slate-500">
              Реальные поступления денег и контроль кассовых разрывов
            </p>
          </div>
          <PeriodFilter currentPeriod={period} currentFrom={from} currentTo={to} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего поступило</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalIncome).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Наличные</div>
                <div className="mt-2 text-3xl font-bold text-green-700">
                  {Math.round(cashIncome).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="text-sm text-blue-700">Карта (Эквайринг)</div>
                <div className="mt-2 text-3xl font-bold text-blue-700">
                  {Math.round(cardIncome).toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                <div className="text-sm text-purple-700">Безнал (Счет)</div>
                <div className="mt-2 text-3xl font-bold text-purple-700">
                  {Math.round(bankIncome).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Динамика поступлений денег</h2>
              <RevenueChart data={chartData} />
            </div>

            {/* Блок зависших денег */}
            <div className="mt-6 rounded-xl border border-red-200 bg-white shadow-sm">
              <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                <h2 className="font-semibold text-red-800">Зависшие деньги (Аномалии): {Math.round(stuckMoney).toLocaleString("ru-RU")} ₽</h2>
                <p className="text-xs text-red-700 mt-1">Оплаты внесены в систему, но не полностью привязаны к заказам (остаток на счете клиента).</p>
              </div>
              {stuckPayments.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Все оплаты корректно привязаны к заказам!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">Сумма оплаты</th>
                        <th className="px-4 py-3 font-medium">Зависший остаток</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">Комментарий</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stuckPayments.slice(0, 50).map((p) => (
                        <tr key={p.paymentId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.createDateTime}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {Math.round(Number(p.amount || 0)).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-red-600 font-medium">
                            {Math.round(Number(p.rest || 0)).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-700">{p.paymentType || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{p.comment || "—"}</td>
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