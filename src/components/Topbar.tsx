"use client";

import { Bell, Search, User } from "lucide-react";

export function Topbar() {
  return (
    <header
  className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white"
  style={{ padding: "0 40px" }}
>
      {/* Поиск */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
    <Search size={16} className="text-slate-400" />
  </div>
  <input
    type="text"
    placeholder="Поиск по заказам, клиентам, артикулам..."
    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
    style={{ paddingLeft: "36px" }}
  />
</div>
      </div>

      {/* Правая часть */}
      <div className="flex items-center gap-4">
        {/* Магазин */}
        <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm md:flex">
          <span className="text-slate-500">Магазин:</span>
          <span className="font-medium text-slate-900">Тестовый магазин</span>
        </div>

        {/* Уведомления */}
        <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition">
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* Пользователь */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User size={16} />
          </div>
          <div className="hidden text-left md:block">
            <div className="text-sm font-medium text-slate-900">Владелец</div>
            <div className="text-xs text-slate-500">test@example.com</div>
          </div>
        </button>
      </div>
    </header>
  );
}