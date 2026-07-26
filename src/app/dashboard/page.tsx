import Link from "next/link";

// Временные данные для демонстрации
// Позже сюда будут приходить реальные данные из API
const stats = [
  {
    label: "Заказов сегодня",
    value: "47",
    color: "text-white",
    description: "+12% к вчера",
  },
  {
    label: "Выручка",
    value: "186 000 ₽",
    color: "text-white",
    description: "+8% к вчера",
  },
  {
    label: "Зависших заказов",
    value: "5",
    color: "text-amber-400",
    description: "более 4 часов",
  },
  {
    label: "Отмены",
    value: "3",
    color: "text-red-400",
    description: "сегодня",
  },
];

const problems = [
  {
    type: "warning",
    text: "Заказ #12848 — Смирнов — без движения 6 часов (Менеджер: Петров)",
  },
  {
    type: "warning",
    text: "Заказ #12851 — Козин — без движения 4 часа (Менеджер: Петров)",
  },
  {
    type: "error",
    text: "Рост отмен: +40% к прошлой неделе",
  },
  {
    type: "info",
    text: "2 заявки без назначенного менеджера",
  },
];

const managers = [
  {
    name: "Козлова А.",
    orders: 134,
    revenue: "1 100 000 ₽",
    cancels: 3,
    avgTime: "8 мин",
    score: 97,
  },
  {
    name: "Иванов С.",
    orders: 156,
    revenue: "1 200 000 ₽",
    cancels: 4,
    avgTime: "12 мин",
    score: 95,
  },
  {
    name: "Сидоров П.",
    orders: 143,
    revenue: "980 000 ₽",
    cancels: 7,
    avgTime: "18 мин",
    score: 82,
  },
  {
    name: "Петров И.",
    orders: 98,
    revenue: "540 000 ₽",
    cancels: 15,
    avgTime: "35 мин",
    score: 54,
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Навигация */}
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Магазин: АвтоМир (тест)
            </span>
            <Link
              href="/connect"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Настройки
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Дашборд собственника</h1>
            <p className="mt-1 text-slate-400">
              Данные за сегодня — обновлено 5 минут назад
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700">
              Сегодня
            </button>
            <button className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Неделя
            </button>
            <button className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Месяц
            </button>
          </div>
        </div>

        {/* Карточки со статистикой */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="text-sm text-slate-400">{stat.label}</div>
              <div className={`mt-2 text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Проблемы */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            ⚠️ Проблемы прямо сейчас
          </h2>
          <ul className="mt-4 space-y-3">
            {problems.map((problem, i) => (
              <li key={i} className="flex items-start gap-3">
                <span>
                  {problem.type === "error" && (
                    <span className="text-red-400">●</span>
                  )}
                  {problem.type === "warning" && (
                    <span className="text-amber-400">●</span>
                  )}
                  {problem.type === "info" && (
                    <span className="text-blue-400">●</span>
                  )}
                </span>
                <span className="text-slate-300">{problem.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Таблица менеджеров */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">👥 Менеджеры</h2>
            <Link
              href="/salary"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Расчёт зарплаты →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="pb-3 pr-4 font-medium">Менеджер</th>
                  <th className="pb-3 pr-4 font-medium">Заказов</th>
                  <th className="pb-3 pr-4 font-medium">Выручка</th>
                  <th className="pb-3 pr-4 font-medium">Отмены</th>
                  <th className="pb-3 pr-4 font-medium">Ср. время</th>
                  <th className="pb-3 font-medium">Оценка</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((manager) => (
                  <tr
                    key={manager.name}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="py-3 pr-4 font-medium">{manager.name}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      {manager.orders}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {manager.revenue}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          manager.cancels > 10
                            ? "text-red-400"
                            : "text-slate-300"
                        }
                      >
                        {manager.cancels}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          parseInt(manager.avgTime) > 20
                            ? "text-amber-400"
                            : "text-slate-300"
                        }
                      >
                        {manager.avgTime}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          manager.score >= 90
                            ? "bg-green-900/50 text-green-400"
                            : manager.score >= 70
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {manager.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}