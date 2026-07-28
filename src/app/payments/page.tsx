import { abcpRequest, formatDate } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";
import { PeriodFilter } from "@/components/PeriodFilter";
import { RevenueChart } from "@/components/RevenueChart";
import { getRange } from "@/lib/dates";

type Payment = {
  paymentId: string;
  paymentNumber: string;
  paymentType: string;
  createDateTime: string;
  amount: number;
  rest: number;
  comment: string;
  userId: string;
  komtetCheckId: number | string;
};

type User = {
  userId: string;
  name: string;
  organizationName: string;
};

type Check = {
  id: string;
  paymentId: string;
  calculationMethod: number; // 0 - Предоплата 100%, 1 - Предоплата, 2 - Полный расчет
  fiscalization: number; // 0 - Нет, 1 - Да
  paymentAmount: number;
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

async function getUsersMap(): Promise<Record<string, string>> {
  const shop = await getShop();
  if (!shop) return {};
  const users = await abcpRequest<User[]>("cp/users", { limit: "1000" }, {
    api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
  });
  
  const map: Record<string, string> = {};
  users.forEach(u => {
    map[u.userId] = u.organizationName || u.name || "Клиент " + u.userId;
  });
  return map;
}

async function getChecks(period: string, from?: string, to?: string): Promise<Record<string, Check[]>> {
  const shop = await getShop();
  if (!shop) return {};
  
  const { dateStart, dateEnd } = getRange(period, from, to);
  
  const dStart = dateStart.toISOString().split("T")[0];
  const dEnd = dateEnd.toISOString().split("T")[0];

  try {
    const data = await abcpRequest<Check[]>("komtet/getChecks", {
      dateCreatedStart: dStart,
      dateCreatedEnd: dEnd,
    }, {
      api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
    });

    const map: Record<string, Check[]> = {};
    if (Array.isArray(data)) {
      data.forEach(c => {
        if (c.paymentId) {
          if (!map[c.paymentId]) map[c.paymentId] = [];
          map[c.paymentId].push(c);
        }
      });
    }
    return map;
  } catch (e) {
    return {};
  }
}

async function getPaymentLinks(paymentNumbers: string[]): Promise<Record<string, string[]>> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден");
  
  const linksMap: Record<string, string[]> = {};
  const chunkSize = 50;
  
  for (let i = 0; i < paymentNumbers.length; i += chunkSize) {
    const chunk = paymentNumbers.slice(i, i + chunkSize);
    const params: Record<string, string> = {};
    chunk.forEach((num, idx) => params[`paymentNumbers[${idx}]`] = num);
    
    try {
      const data = await abcpRequest<any[]>("cp/finance/paymentOrderLinks", params, {
        api_url: shop.api_url, api_login: shop.api_login, api_password_md5: shop.api_password_md5,
      });
      
      if (Array.isArray(data)) {
        data.forEach(link => {
          if (link.paymentNumber) {
            if (!linksMap[link.paymentNumber]) linksMap[link.paymentNumber] = [];
            if (link.orderId && link.orderId !== "0") {
              linksMap[link.paymentNumber].push(link.orderId);
            }
          }
        });
      }
    } catch (e) {
      // Игнорируем ошибки чанков
    }
  }
  return linksMap;
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
  let usersMap: Record<string, string> = {};
  let linksMap: Record<string, string[]> = {};
  let checksMap: Record<string, Check[]> = {};
  let error: string | null = null;

  try {
    const [pmts, users] = await Promise.all([getPayments(period, from, to), getUsersMap()]);
    payments = pmts;
    usersMap = users;

    const allPaymentNumbers = payments.map(p => p.paymentNumber).filter(Boolean);
    if (allPaymentNumbers.length > 0) {
      linksMap = await getPaymentLinks(allPaymentNumbers);
    }
    
    checksMap = await getChecks(period, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  let totalIncome = 0;
  let stuckMoney = 0;
  const typeMap = new Map<string, number>();
  const chartMap = new Map<string, { amount: number; time: number }>();
  const stuckPayments: Payment[] = [];

  for (const p of payments) {
    const amount = Number(p.amount || 0);
    if (amount > 0) {
      totalIncome += amount;
      const typeName = p.paymentType || "Неизвестно";
      typeMap.set(typeName, (typeMap.get(typeName) || 0) + amount);

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
      margin: 0,
    }));

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Аналитика оплат</h1>
            <p className="mt-1 text-sm text-slate-500">
              Реальные поступления денег, контроль чеков и привязка к заказам
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
              
              {Array.from(typeMap.entries()).slice(0, 3).map(([typeName, sum]) => (
                <div key={typeName} className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                  <div className="text-sm text-blue-700">{typeName}</div>
                  <div className="mt-2 text-3xl font-bold text-blue-700">
                    {Math.round(sum).toLocaleString("ru-RU")} ₽
                  </div>
                </div>
              ))}
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
                        <th className="px-4 py-3 font-medium">№ Платежа</th>
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Сумма оплаты</th>
                        <th className="px-4 py-3 font-medium">Зависший остаток</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stuckPayments.slice(0, 50).map((p) => (
                        <tr key={p.paymentId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-blue-600">{p.paymentNumber || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.createDateTime}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                            {usersMap[p.userId] || "ID: " + p.userId}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {Math.round(Number(p.amount || 0)).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-red-600 font-medium">
                            {Math.round(Number(p.rest || 0)).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{p.paymentType || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Полный список оплат */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">История оплат ({payments.length})</h2>
                <p className="text-xs text-slate-500 mt-1">Подробная информация о каждом платеже, клиенте, заказе и статусе чека</p>
              </div>
              {payments.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Нет оплат за этот период.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">№ Платежа</th>
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Сумма</th>
                        <th className="px-4 py-3 font-medium">Тип</th>
                        <th className="px-4 py-3 font-medium">Статус чека</th>
                        <th className="px-4 py-3 font-medium">Привязка к заказу</th>
                        <th className="px-4 py-3 font-medium">Остаток</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 200).map((p) => {
                        const amount = Number(p.amount || 0);
                        const rest = Number(p.rest || 0);
                        const clientName = usersMap[p.userId] || "Клиент " + p.userId;
                        const linkedOrders = linksMap[p.paymentNumber] || [];
                        
                        const checks = checksMap[p.paymentId] || [];
                        let hasAdvance = false;
                        let hasFull = false;
                        let isFiscalized = false;

                        checks.forEach(c => {
                          if (c.calculationMethod === 0 || c.calculationMethod === 1 || c.calculationMethod === 3) hasAdvance = true;
                          if (c.calculationMethod === 2) hasFull = true;
                          if (c.fiscalization === 1) isFiscalized = true;
                        });

                        let checkStatus = <span className="text-red-600 font-medium">Нет чека</span>;
                        if (hasAdvance && !hasFull) {
                          checkStatus = <span className="text-amber-600 font-medium">Только аванс{!isFiscalized ? " (не фиск.)" : ""}</span>;
                        } else if (hasFull) {
                          checkStatus = <span className="text-green-700 font-medium">Закрывающий{!isFiscalized ? " (не фиск.)" : ""}</span>;
                        } else if (hasAdvance && hasFull) {
                           checkStatus = <span className="text-green-700 font-medium">Полный{!isFiscalized ? " (не фиск.)" : ""}</span>;
                        }

                        return (
                          <tr key={p.paymentId} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{p.createDateTime}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{p.paymentNumber || "—"}</td>
                            <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate">{clientName}</td>
                            <td className={`px-4 py-3 font-medium ${amount > 0 ? "text-green-700" : "text-red-600"}`}>
                              {Math.round(amount).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs">{p.paymentType || "—"}</td>
                            <td className="px-4 py-3 text-xs">
                              {checkStatus}
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs">
                              {linkedOrders.length > 0 ? linkedOrders.join(", ") : "—"}
                            </td>
                            <td className={`px-4 py-3 font-medium ${rest > 0 ? "text-red-600" : "text-slate-400"}`}>
                              {rest > 0 ? Math.round(rest).toLocaleString("ru-RU") + " ₽" : "—"}
                            </td>
                          </tr>
                        );
                      })}
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