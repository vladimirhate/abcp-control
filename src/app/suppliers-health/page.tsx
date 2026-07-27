import { abcpRequest } from "@/lib/abcp";
import { getShop } from "@/lib/shop";
import { AppLayout } from "@/components/AppLayout";

type Distributor = {
  id: string;
  name: string;
  isEnabled: boolean;
  updateTime: string | null;
  updateRateInDays: number;
  positionsNumber: number | string;
};

async function getDistributors(): Promise<Distributor[]> {
  const shop = await getShop();
  if (!shop) throw new Error("Магазин не найден в БД");

  return abcpRequest<Distributor[]>(
    "cp/distributors",
    {},
    {
      api_url: shop.api_url,
      api_login: shop.api_login,
      api_password_md5: shop.api_password_md5,
    }
  );
}

export default async function SuppliersHealthPage() {
  let distributors: Distributor[] = [];
  let error: string | null = null;

  try {
    distributors = await getDistributors();
  } catch (e) {
    error = e instanceof Error ? e.message : "Ошибка загрузки данных";
  }

  const now = new Date();

  const processedDistributors = distributors.map(d => {
    if (!d.isEnabled) {
      return { ...d, status: "disabled" as const, daysSinceUpdate: null };
    }

    if (!d.updateTime) {
      return { ...d, status: "online" as const, daysSinceUpdate: null };
    }

    const updateDate = new Date(d.updateTime.replace(" ", "T"));
    const diffTime = now.getTime() - updateDate.getTime();
    const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const rateInDays = d.updateRateInDays > 0 ? d.updateRateInDays : 7;
    const isOutdated = daysSince > rateInDays;

    return {
      ...d,
      status: isOutdated ? "outdated" as const : "ok" as const,
      daysSinceUpdate: daysSince,
    };
  });

  const sortPriority = { outdated: 0, disabled: 1, ok: 2, online: 3 };
  processedDistributors.sort((a, b) => sortPriority[a.status] - sortPriority[b.status]);

  const totalSuppliers = distributors.length;
  const outdatedCount = processedDistributors.filter(d => d.status === "outdated").length;
  const disabledCount = processedDistributors.filter(d => d.status === "disabled").length;
  const activeCount = totalSuppliers - outdatedCount - disabledCount;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Здоровье поставщиков</h1>
          <p className="mt-1 text-sm text-slate-500">
            Актуальность прайс-листов и очистка системы от мусора
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Ошибка: {error}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего поставщиков</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{totalSuppliers}</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="text-sm text-red-700">Устарели прайсы</div>
                <div className="mt-2 text-3xl font-bold text-red-700">{outdatedCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отключены (мусор)</div>
                <div className="mt-2 text-3xl font-bold text-slate-500">{disabledCount}</div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="text-sm text-green-700">Актуальные</div>
                <div className="mt-2 text-3xl font-bold text-green-700">{activeCount}</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Статус прайс-листов</h2>
                <p className="text-xs text-slate-500 mt-1">Красные — просрочены, менеджеры могут продавать несуществующие товары</p>
              </div>
              {processedDistributors.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Поставщики не найдены.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Поставщик</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Позиций</th>
                        <th className="px-4 py-3 font-medium">Норма обновления</th>
                        <th className="px-4 py-3 font-medium">Обновлено</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedDistributors.map((d) => (
                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className={`px-4 py-3 font-medium ${d.status === 'disabled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {d.name}
                          </td>
                          <td className="px-4 py-3">
                            {d.status === "outdated" && (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                🔴 Устарел на {d.daysSinceUpdate} дн.
                              </span>
                            )}
                            {d.status === "disabled" && (
                              <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                                Отключен
                              </span>
                            )}
                            {d.status === "ok" && (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                🟢 Актуален
                              </span>
                            )}
                            {d.status === "online" && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                Онлайн
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{Number(d.positionsNumber || 0).toLocaleString("ru-RU")}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {d.updateRateInDays > 0 ? `${d.updateRateInDays} дн.` : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {d.updateTime ? d.updateTime : "—"}
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