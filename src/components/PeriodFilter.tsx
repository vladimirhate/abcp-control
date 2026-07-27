"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { key: "last7", label: "7 дней" },
  { key: "last14", label: "2 недели" },
  { key: "this_month", label: "Этот месяц" },
  { key: "prev_month", label: "Прошлый месяц" },
  { key: "last6months", label: "Полгода" },
];

export function PeriodFilter({ currentPeriod, currentFrom, currentTo }: { currentPeriod?: string, currentFrom?: string, currentTo?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(currentFrom || "");
  const [to, setTo] = useState(currentTo || "");

  function applyPreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.set("period", preset);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (from && to) {
      params.set("from", from);
      params.set("to", to);
      params.delete("period");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const isCustomActive = !!(currentFrom && currentTo);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            currentPeriod === p.key && !isCustomActive
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {p.label}
        </button>
      ))}

      <form onSubmit={applyCustomRange} className="flex items-center gap-2 border-l border-slate-200 pl-2 ml-1">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 outline-none focus:border-blue-500"
        />
        <span className="text-slate-400 text-sm">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            isCustomActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          ОК
        </button>
      </form>
    </div>
  );
}