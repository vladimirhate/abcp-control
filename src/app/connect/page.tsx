"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiLogin, setApiLogin] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkShop() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const res = await fetch("/api/shop");
      const data = await res.json();
      if (data.success && data.data) {
        router.push("/dashboard");
      }
    }
    checkShop();
  }, [router]);

  function formatUrl(url: string) {
    let cleanUrl = url.trim().replace(/\/+$/, "");
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    return cleanUrl;
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setMessage(null);

    try {
      const testRes = await fetch("/api/shop/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_url: formatUrl(apiUrl), api_login: apiLogin, api_password_md5: apiPassword }),
      });
      const testData = await testRes.json();

      if (!testData.success) {
        throw new Error(testData.error || "Не удалось подключиться к API ABCP");
      }

      setMessage({ type: "success", text: "Подключение успешно! Сохраняем..." });

      setTesting(false);
      setLoading(true);
      
      const saveRes = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, api_url: formatUrl(apiUrl), api_login: apiLogin, api_password_md5: apiPassword }),
      });
      const saveData = await saveRes.json();

      if (!saveData.success) {
        throw new Error(saveData.error || "Ошибка сохранения");
      }

      router.push("/dashboard");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Ошибка" });
    } finally {
      setTesting(false);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Подключение магазина</h1>
        <p className="mt-1 text-sm text-slate-500">Введите данные API-администратора из панели управления ABCP</p>

        <form onSubmit={handleConnect} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Название магазина</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Например: АвтоМир"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">URL API</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 sm:text-sm">https://</span>
              </div>
              <input
                type="text"
                required
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-16 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="xxx.public.api.abcp.ru"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Логин API</label>
            <input
              type="text"
              required
              value={apiLogin}
              onChange={(e) => setApiLogin(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="api@xxx"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Пароль (MD5)</label>
            <input
              type="text"
              required
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="32 символа"
            />
          </div>

          {message && (
            <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || testing}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? "Проверяем подключение..." : loading ? "Сохраняем..." : "Подключить магазин"}
          </button>
        </form>
      </div>
    </div>
  );
}