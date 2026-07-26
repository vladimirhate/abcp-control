"use client";

import { useState } from "react";
import Link from "next/link";

type ApiOrder = {
  number: string;
  date: string;
  dateUpdated: string;
  userName: string;
  userEmail: string;
  managerId: string;
  sum: number;
  positionsQuantity: number;
  paid: boolean;
};

type ApiResponse = {
  success: boolean;
  data?: ApiOrder[];
  error?: string;
};

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function loadOrders() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/abcp/orders");
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Ошибка запроса",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
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
        <h1 className="text-2xl font-bold">Тест заказов из API</h1>
        <p className="mt-2 text-slate-400">
          Проверяем, что данные из ABCP можно показать в интерфейсе.
        </p>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Загружаю..." : "Загрузить заказы"}
        </button>

        {result && !result.success && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-300">
            Ошибка: {result.error}
          </div>
        )}

        {result && result.success && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="font-semibold">
                Заказы: {result.data?.length ?? 0}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="px-4 py-3 font-medium">№ заказа</th>
                    <th className="px-4 py-3 font-medium">Клиент</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Сумма</th>
                    <th className="px-4 py-3 font-medium">Позиций</th>
                    <th className="px-4 py-3 font-medium">Оплачен</th>
                    <th className="px-4 py-3 font-medium">Обновлён</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data?.map((order) => (
                    <tr
                      key={order.number}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-blue-400">
                        {order.number}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {order.userName || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {order.userEmail || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {order.sum?.toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {order.positionsQuantity}
                      </td>
                      <td className="px-4 py-3">
                        {order.paid ? (
                          <span className="text-green-400">Да</span>
                        ) : (
                          <span className="text-amber-400">Нет</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {order.dateUpdated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}