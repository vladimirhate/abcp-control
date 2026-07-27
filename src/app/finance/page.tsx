import { abcpRequest } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

type User = {
  userId: string;
  name: string;
  organizationName: string;
  debt: number | string;
  creditLimit: number | string;
  overdueSaldo: number | string;
  balance: number | string;
  inStopList: boolean;
};

// Безопасное преобразование в число
function safeNum(val: any): number {
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

async function getUsers(): Promise<User[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  const data = await abcpRequest<User[]>(
    "cp/users",
    { state: "1", limit: "1000" },
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );

  return data;
}

function getClientName(user: User): string {
  return user.organizationName || `${user.name}`.trim() || "Клиент " + user.userId;
}

export default async function FinancePage() {
  let users: User[] = [];
  let error: string | null = null;

  try {
    users = await getUsers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  // Оставляем только тех, у кого есть долг, либо превышен лимит, либо просрочка
  const debtors = users
    .filter(u => safeNum(u.debt) > 0 || safeNum(u.overdueSaldo) > 0 || u.inStopList)
    .map(u => {
      const debt = safeNum(u.debt);
      const limit = safeNum(u.creditLimit);
      const overdue = safeNum(u.overdueSaldo);
      const limitUsage = limit > 0 ? (debt / limit) * 100 : 0;

      let riskLevel: "overdue" | "critical" | "warning" | "normal" = "normal";
      if (overdue > 0) riskLevel = "overdue";
      else if (limit > 0 && limitUsage >= 80) riskLevel = "critical";
      else if (limit > 0 && limitUsage >= 50) riskLevel = "warning";

      return {
        ...u,
        debt,
        limit,
        overdue,
        limitUsage,
        riskLevel,
      };
    })
    .sort((a, b) => b.debt - a.debt); // Сортируем по сумме долга (от большего к меньшему)

  const totalDebt = debtors.reduce((sum, u) => sum + u.debt, 0);
  const totalOverdue = debtors.reduce((sum, u) => sum + u.overdue, 0);
  const stopListCount = debtors.filter(u => u.inStopList).length;

  // Отдельный список тех, кто близок к лимиту (но без просрочки)
  const nearLimit = debtors.filter(u => (u.riskLevel === "critical" || u.riskLevel === "warning") && u.overdue === 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Финансы и риски</h1>
          <p className="mt-1 text-sm text-slate-500">
            Контроль дебиторской задолженности и кредитных лимитов
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="text-sm text-red-700">Общая дебиторка</div>
                <div className="mt-2 text-3xl font-bold text-red-700">
                  {Math.round(totalDebt).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-red-700">Сколько должны магазину</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Просрочено</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {Math.round(totalOverdue).toLocaleString("ru-RU")} ₽
                </div>
                <div className="mt-1 text-xs text-slate-500">Требует срочного взыскания</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="text-sm text-amber-700">В стоп-листе</div>
                <div className="mt-2 text-3xl font-bold text-amber-700">
                  {stopListCount}
                </div>
                <div className="mt-1 text-xs text-amber-700">Отгрузки заблокированы</div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                <div className="text-sm text-orange-700">Близки к лимиту</div>
                <div className="mt-2 text-3xl font-bold text-orange-700">
                  {nearLimit.length}
                </div>
                <div className="mt-1 text-xs text-orange-700">Использовано &gt; 50% лимита</div>
              </div>
            </div>

            {/* Топ должников */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Топ должников</h2>
                <p className="text-xs text-slate-500 mt-1">Отсортировано по общей сумме долга</p>
              </div>
              {debtors.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Должников нет. Все оплаты вовремя!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Клиент</th>
                        <th className="px-4 py-3 font-medium">Долг</th>
                        <th className="px-4 py-3 font-medium">Просрочка</th>
                        <th className="px-4 py-3 font-medium">Лимит</th>
                        <th className="px-4 py-3 font-medium">Исп. лимита</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtors.slice(0, 50).map((u) => (
                        <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                            {getClientName(u)}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {Math.round(u.debt).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className={`px-4 py-3 font-medium ${u.overdue > 0 ? "text-red-600" : "text-slate-500"}`}>
                            {u.overdue > 0 ? Math.round(u.overdue).toLocaleString("ru-RU") + " ₽" : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {u.limit > 0 ? Math.round(u.limit).toLocaleString("ru-RU") + " ₽" : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {u.limit > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-slate-200">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      u.riskLevel === "critical" ? "bg-red-500" : 
                                      u.riskLevel === "warning" ? "bg-amber-500" : "bg-green-500"
                                    }`} 
                                    style={{ width: `${Math.min(u.limitUsage, 100)}%` }} 
                                  />
                                </div>
                                <span className="text-xs text-slate-600">{u.limitUsage.toFixed(0)}%</span>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {u.inStopList && (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                Стоп-лист
                              </span>
                            )}
                            {!u.inStopList && u.riskLevel === "overdue" && (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                Просрочка
                              </span>
                            )}
                            {!u.inStopList && u.riskLevel === "critical" && (
                              <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                Критично
                              </span>
                            )}
                            {!u.inStopList && u.riskLevel === "warning" && (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                Внимание
                              </span>
                            )}
                            {!u.inStopList && u.riskLevel === "normal" && (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                Ок
                              </span>
                            )}
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