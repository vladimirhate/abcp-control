"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Wallet, Save, CheckCircle, XCircle } from "lucide-react";

export default function SalarySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [baseSalary, setBaseSalary] = useState(0);
  const [revenuePercent, setRevenuePercent] = useState(0);
  const [marginPercent, setMarginPercent] = useState(0);
  const [paidRevenuePercent, setPaidRevenuePercent] = useState(0);
  const [planThreshold, setPlanThreshold] = useState(0);
  const [planBonus, setPlanBonus] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/salary-rule");
        const result = await response.json();
        if (result.success && result.data) {
          setBaseSalary(Number(result.data.base_salary) || 0);
          setRevenuePercent(Number(result.data.revenue_percent) || 0);
          setMarginPercent(Number(result.data.margin_percent) || 0);
          setPaidRevenuePercent(Number(result.data.paid_revenue_percent) || 0);
          setPlanThreshold(Number(result.data.plan_threshold) || 0);
          setPlanBonus(Number(result.data.plan_bonus) || 0);
        }
      } catch (e) {
        setMessage({ type: "error", text: "Не удалось загрузить правила" });
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
      const response = await fetch("/api/salary-rule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_salary: baseSalary,
          revenue_percent: revenuePercent,
          margin_percent: marginPercent,
          paid_revenue_percent: paidRevenuePercent,
          plan_threshold: planThreshold,
          plan_bonus: planBonus,
        }),
      });
      const result = await response.json();
      if (result.success) setMessage({ type: "success", text: "Правила сохранены" });
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
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Правила зарплаты</h1>
            <p className="mt-1 text-sm text-slate-500">Формула расчёта ЗП менеджеров</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Загрузка...
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Оклад, ₽
                  </label>
                  <input type="number" value={baseSalary} onChange={(e) => setBaseSalary(Number(e.target.value))} className={inputClass} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    % от выручки
                  </label>
                  <input type="number" step="0.1" value={revenuePercent} onChange={(e) => setRevenuePercent(Number(e.target.value))} className={inputClass} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    % от маржи
                  </label>
                  <input type="number" step="0.1" value={marginPercent} onChange={(e) => setMarginPercent(Number(e.target.value))} className={inputClass} />
                  <p className="mt-1 text-xs text-slate-500">Мотивация на прибыль</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    % за оплаченные заказы
                  </label>
                  <input type="number" step="0.1" value={paidRevenuePercent} onChange={(e) => setPaidRevenuePercent(Number(e.target.value))} className={inputClass} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    План по выручке, ₽
                  </label>
                  <input type="number" value={planThreshold} onChange={(e) => setPlanThreshold(Number(e.target.value))} className={inputClass} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Бонус за план, ₽
                  </label>
                  <input type="number" value={planBonus} onChange={(e) => setPlanBonus(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {message && (
                <div
                  className={`mt-5 flex items-start gap-3 rounded-lg border p-3 text-sm ${
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
            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-medium text-blue-900">Предпросмотр формулы</h3>
              <div className="mt-3 font-mono text-sm text-blue-800">
                ЗП = <span className="font-bold">{baseSalary.toLocaleString("ru-RU")} ₽</span>
                {revenuePercent > 0 && <> + <span className="font-bold">{revenuePercent}%</span> × выручка</>}
                {marginPercent > 0 && <> + <span className="font-bold">{marginPercent}%</span> × маржа</>}
                {paidRevenuePercent > 0 && <> + <span className="font-bold">{paidRevenuePercent}%</span> × оплаченное</>}
                {planBonus > 0 && planThreshold > 0 && <> + <span className="font-bold">{planBonus.toLocaleString("ru-RU")} ₽</span> (если выручка ≥ {planThreshold.toLocaleString("ru-RU")} ₽)</>}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}