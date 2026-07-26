"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Bell, Save, CheckCircle, XCircle } from "lucide-react";

export default function AlertsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [stuckHours, setStuckHours] = useState(24);
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyTime, setDailyTime] = useState("09:00");
  const [telegramChatId, setTelegramChatId] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/alerts-settings");
        const result = await response.json();
        if (result.success && result.data) {
          setStuckHours(Number(result.data.stuck_order_hours) || 24);
          setDailyEnabled(Boolean(result.data.daily_report_enabled));
          setDailyTime((result.data.daily_report_time || "09:00").slice(0, 5));
          setTelegramChatId(result.data.telegram_chat_id || "");
        }
      } catch (e) {
        setMessage({ type: "error", text: "Не удалось загрузить настройки" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/alerts-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stuck_order_hours: stuckHours,
          daily_report_enabled: dailyEnabled,
          daily_report_time: dailyTime,
          telegram_chat_id: telegramChatId,
        }),
      });
      const result = await response.json();
      if (result.success) setMessage({ type: "success", text: "Настройки сохранены" });
      else setMessage({ type: "error", text: result.error });
    } catch (e) {
      setMessage({ type: "error", text: "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Настройки алертов</h1>
            <p className="mt-1 text-sm text-slate-500">Уведомления о важных событиях</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Загрузка...
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Зависшие заказы</h2>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Заказ считается зависшим, если не обновлялся дольше (часов)
                </label>
                <input
                  type="number"
                  min="1"
                  value={stuckHours}
                  onChange={(e) => setStuckHours(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Ежедневный отчёт</h2>

              <div className="mt-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="daily"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="daily" className="text-sm text-slate-700">
                  Отправлять ежедневный отчёт
                </label>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Время отправки
                </label>
                <input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                  disabled={!dailyEnabled}
                  className={inputClass + " disabled:opacity-50"}
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Telegram</h2>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Chat ID для уведомлений
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="123456789"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Напишите боту @userinfobot чтобы узнать свой Chat ID
                </p>
              </div>
            </div>

            {message && (
              <div
                className={`mt-6 flex items-start gap-3 rounded-lg border p-3 text-sm ${
                  message.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message.type === "success" ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
                <div>{message.text}</div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50">
                <Save size={16} />
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}