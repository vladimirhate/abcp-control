"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // После регистрации сразу входим
        await supabase.auth.signInWithPassword({ email, password });
        router.push("/connect"); // Новые пользователи идут подключать магазин
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "login" ? "Вход в систему" : "Регистрация"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login" ? "Войдите в свой кабинет ABCP Control" : "Создайте аккаунт за 10 секунд"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Минимум 6 символов"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>Нет аккаунта? <button onClick={() => setMode("register")} className="font-medium text-blue-600 hover:underline">Создать</button></>
          ) : (
            <>Уже есть аккаунт? <button onClick={() => setMode("login")} className="font-medium text-blue-600 hover:underline">Войти</button></>
          )}
        </div>
      </div>
    </div>
  );
}