import Link from "next/link";

// Временные данные
const salaryData = [
  {
    name: "Иванов С.",
    baseSalary: 30000,
    revenueBonus: 36000,
    marginBonus: 12000,
    planBonus: 5000,
    cancelPenalty: 2000,
    returnPenalty: 0,
    delayPenalty: 0,
    total: 81000,
    orders: 156,
    revenue: 1200000,
  },
  {
    name: "Сидоров П.",
    baseSalary: 30000,
    revenueBonus: 29400,
    marginBonus: 8200,
    planBonus: 0,
    cancelPenalty: 2100,
    returnPenalty: 700,
    delayPenalty: 700,
    total: 64100,
    orders: 143,
    revenue: 980000,
  },
  {
    name: "Петров И.",
    baseSalary: 30000,
    revenueBonus: 16200,
    marginBonus: 4100,
    planBonus: 0,
    cancelPenalty: 4500,
    returnPenalty: 2000,
    delayPenalty: 2000,
    total: 41800,
    orders: 98,
    revenue: 540000,
  },
  {
    name: "Козлова А.",
    baseSalary: 30000,
    revenueBonus: 33000,
    marginBonus: 11500,
    planBonus: 5000,
    cancelPenalty: 900,
    returnPenalty: 300,
    delayPenalty: 300,
    total: 78000,
    orders: 134,
    revenue: 1100000,
  },
];

const totalFot = salaryData.reduce((sum, m) => sum + m.total, 0);

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU") + " ₽";
}

export default function SalaryPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Навигация */}
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Дашборд
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Заголовок */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Расчёт зарплаты</h1>
            <p className="mt-1 text-slate-400">
              Период: 1 — 30 июня 2025 года
            </p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Выбрать период
            </button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500">
              Скачать Excel
            </button>
          </div>
        </div>

        {/* Итоговый ФОТ */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Фонд оплаты труда</div>
            <div className="mt-2 text-3xl font-bold text-white">
              {formatMoney(totalFot)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              за текущий период
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Менеджеров</div>
            <div className="mt-2 text-3xl font-bold">
              {salaryData.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              в расчётном периоде
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Средняя ЗП</div>
            <div className="mt-2 text-3xl font-bold">
              {formatMoney(Math.round(totalFot / salaryData.length))}
            </div>
            <div className="mt-1 text-xs text-slate-500">по всем</div>
          </div>
        </div>

        {/* Таблица */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-semibold">Детализация по менеджерам</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-6 py-3 font-medium">Менеджер</th>
                  <th className="px-4 py-3 font-medium">Оклад</th>
                  <th className="px-4 py-3 font-medium">% выручки</th>
                  <th className="px-4 py-3 font-medium">% маржи</th>
                  <th className="px-4 py-3 font-medium">Бонус план</th>
                  <th className="px-4 py-3 font-medium text-red-400">
                    Штрафы
                  </th>
                  <th className="px-6 py-3 font-medium text-green-400">
                    Итого
                  </th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map((manager) => {
                  const penalties =
                    manager.cancelPenalty +
                    manager.returnPenalty +
                    manager.delayPenalty;
                  return (
                    <tr
                      key={manager.name}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">{manager.name}</div>
                        <div className="text-xs text-slate-500">
                          {manager.orders} заказов ·{" "}
                          {formatMoney(manager.revenue)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {formatMoney(manager.baseSalary)}
                      </td>
                      <td className="px-4 py-4 text-green-400">
                        +{formatMoney(manager.revenueBonus)}
                      </td>
                      <td className="px-4 py-4 text-green-400">
                        +{formatMoney(manager.marginBonus)}
                      </td>
                      <td className="px-4 py-4">
                        {manager.planBonus > 0 ? (
                          <span className="text-green-400">
                            +{formatMoney(manager.planBonus)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {penalties > 0 ? (
                          <span className="text-red-400">
                            −{formatMoney(penalties)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-white">
                          {formatMoney(manager.total)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700">
                  <td className="px-6 py-4 font-semibold">ИТОГО ФОТ</td>
                  <td
                    colSpan={5}
                    className="px-4 py-4 text-slate-400 text-sm"
                  >
                    {salaryData.length} менеджера
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xl font-bold text-blue-400">
                      {formatMoney(totalFot)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Кнопка настройки правил */}
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center">
          <p className="text-slate-400">
            Хотите изменить формулу расчёта зарплаты?
          </p>
          <Link
            href="/salary/rules"
            className="mt-3 inline-block rounded-lg bg-slate-800 px-5 py-2 text-sm hover:bg-slate-700"
          >
            Настроить правила →
          </Link>
        </div>
      </div>
    </main>
  );
}