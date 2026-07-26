import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Навигация */}
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </span>
          <Link
            href="/connect"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Подключить магазин
          </Link>
        </div>
      </nav>

      {/* Герой */}
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight">
            Контроль магазина{" "}
            <span className="text-blue-400">автозапчастей</span> в одном окне
          </h1>

          <p className="mt-6 text-xl text-slate-300">
            Видите всё, что происходит в магазине: заказы, менеджеры,
            зависшие позиции и зарплаты — в реальном времени.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Открыть дашборд →
            </Link>
            <Link
              href="/connect"
              className="rounded-lg border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800"
            >
              Подключить магазин
            </Link>
          </div>
        </div>

        {/* Блок возможностей */}
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-3xl">📊</div>
            <h3 className="mt-4 text-lg font-semibold">
              Контроль в реальном времени
            </h3>
            <p className="mt-2 text-slate-400">
              Зависшие заказы, отмены, задержки — всё видно сразу. Никаких
              сюрпризов в конце дня.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-3xl">👥</div>
            <h3 className="mt-4 text-lg font-semibold">
              Контроль менеджеров
            </h3>
            <p className="mt-2 text-slate-400">
              Кто работает хорошо, кто тормозит. Рейтинг, скорость обработки,
              количество ошибок.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-3xl">💰</div>
            <h3 className="mt-4 text-lg font-semibold">
              Автоматический расчёт ЗП
            </h3>
            <p className="mt-2 text-slate-400">
              Настройте формулу один раз. Оклад, проценты, бонусы, штрафы —
              считается автоматически.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}