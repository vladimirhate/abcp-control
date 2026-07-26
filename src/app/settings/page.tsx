"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Store, TestTube, Save, CheckCircle, XCircle } from "lucide-react";

type Shop = {
  id: string;
  name: string;
  api_url: string;
  api_login: string;
  api_password_md5: string;
};

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Форма
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiLogin, setApiLogin] = useState("");
  const [apiPassword, setApiPassword] = useState("");

  useEffect(() => {
    async function loadShop() {
      try {
        const response = await fetch("/api/shop");
        const result = await response.json();
        if (result.success && result.data) {
          setShop(result.data);
          setName(result.data.name || "");
          setApiUrl(result.data.api_url || "");
          setApiLogin(result.data.api_login || "");
          setApiPassword(result.data.api_password_md5 || "");
        }
      } catch (e) {
        setMessage({
          type: "error",
          text: "Не удалось загрузить данные магазина",
        });
      } finally {
        setLoading(false);
      }
    }
    loadShop();
  }, []);

  async function testConnection() {
    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/shop/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_url: apiUrl,
          api_login: apiLogin,
          api_password_md5: apiPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Ошибка проверки подключения" });
    } finally {
      setTesting(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          api_url: apiUrl,
          api_login: apiLogin,
          api_password_md5: apiPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: "Настройки сохранены" });
        setShop(result.data);
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Мой магазин</h1>
            <p className="mt-1 text-sm text-slate-500">
              Данные подключения к API ABCP
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Загрузка...
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Название магазина
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: АвтоМир"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    URL API
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://xxx.public.api.abcp.ru"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Без слеша в конце
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Логин API
                  </label>
                  <input
                    type="text"
                    value={apiLogin}
                    onChange={(e) => setApiLogin(e.target.value)}
                    placeholder="api@xxx"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Пароль (MD5-хэш)
                  </label>
                  <input
                    type="text"
                    value={apiPassword}
                    onChange={(e) => setApiPassword(e.target.value)}
                    placeholder="MD5-хэш пароля"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Пароль от API уже в формате MD5 (32 символа)
                  </p>
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
                  {message.type === "success" ? (
                    <CheckCircle size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                  )}
                  <div>{message.text}</div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={testConnection}
                  disabled={testing || saving}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <TestTube size={16} />
                  {testing ? "Проверяю..." : "Проверить подключение"}
                </button>

                <button
                  onClick={saveSettings}
                  disabled={saving || testing}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-medium text-slate-900">
                Где найти данные API?
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Зайдите в ПУ вашего магазина на ABCP</li>
                <li>2. Перейдите в раздел Настройки → Данные для доступа к API</li>
                <li>4. Скопируйте хост логин и MD5-пароль</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}