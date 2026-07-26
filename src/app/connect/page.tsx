import Link from "next/link";

export default function ConnectPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Навигация */}
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-blue-400">
            ABCP Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold">Подключение магазина</h1>
        <p className="mt-2 text-slate-400">
          Введите данные для подключения к API вашего магазина на ABCP.
          Данные хранятся в зашифрованном виде.
        </p>

        {/* Форма */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="space-y-5">
            {/* Название */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Название магазина
              </label>
              <input
                type="text"
                placeholder="Например: АвтоМир"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* URL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                URL вашего сайта на ABCP
              </label>
              <input
                type="text"
                placeholder="https://example.abcp.ru"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Это адрес вашего магазина, не API. Мы сформируем URL
                автоматически.
              </p>
            </div>

            {/* Логин */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Логин API
              </label>
              <input
                type="text"
                placeholder="Логин от API ABCP"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Пароль */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Пароль API
              </label>
              <input
                type="password"
                placeholder="Пароль от API ABCP"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium hover:bg-slate-800"
              >
                Проверить подключение
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium hover:bg-blue-500"
              >
                Сохранить и продолжить →
              </button>
            </div>
          </div>
        </div>

        {/* Подсказка */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="font-medium text-slate-300">
            Как найти данные API?
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-400">
            <li>1. Зайдите в админку вашего магазина на ABCP</li>
            <li>2. Перейдите в раздел Настройки → API</li>
            <li>3. Скопируйте логин и пароль API</li>
            <li>
              4. Если API не активирован — обратитесь в поддержку ABCP
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}