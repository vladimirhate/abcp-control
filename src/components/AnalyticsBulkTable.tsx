"use client";

import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";

type Client = {
  id: string;
  name: string;
  rating?: string;
  lastOrderDate?: string;
  totalSum?: number;
  cancelRate?: number;
};

type Profile = { profileId: string; name: string; };

export function AnalyticsBulkTable({ 
  title, 
  clients, 
  profiles,
  color = "slate"
}: { 
  title: string; 
  clients: Client[]; 
  profiles: Profile[];
  color?: "slate" | "red" | "amber";
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProfile, setBulkProfile] = useState("");
  const [bulkState, setBulkState] = useState("");
  const [bulkAction, setBulkAction] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === clients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map(c => c.id));
    }
  }

  async function applyBulkAction() {
    if (selectedIds.length === 0) return;
    setBulkAction(true);

    const body: any = { userIds: selectedIds };
    if (bulkProfile) body.profileId = bulkProfile;
    if (bulkState) body.state = bulkState;

    const res = await fetch("/api/abcp/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    alert(data.message || "Готово");
    
    setBulkAction(false);
    setSelectedIds([]);
    setBulkProfile("");
    setBulkState("");
  }

  const colors = {
    slate: "border-slate-200",
    red: "border-red-200",
    amber: "border-amber-200"
  };

  return (
    <div className={`mt-6 rounded-xl border ${colors[color]} bg-white shadow-sm`}>
      <div className={`border-b ${colors[color]} px-6 py-4 flex items-center justify-between`}>
        <h2 className="font-semibold text-slate-900">{title} ({clients.length})</h2>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-900">Выбрано: {selectedIds.length}</span>
            <select value={bulkProfile} onChange={(e) => setBulkProfile(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
              <option value="">Профиль</option>
              {profiles.map(p => <option key={p.profileId} value={p.profileId}>{p.name}</option>)}
            </select>
            <select value={bulkState} onChange={(e) => setBulkState(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
              <option value="">Статус</option>
              <option value="1">Активен</option>
              <option value="-1">Отклонить</option>
              <option value="2">Удалить</option>
            </select>
            <button onClick={applyBulkAction} disabled={bulkAction} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {bulkAction ? "..." : "Применить"}
            </button>
          </div>
        )}
      </div>
      {clients.length === 0 ? (
        <div className="p-6 text-center text-slate-500">Нет данных.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === clients.length ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Выручка</th>
                <th className="px-4 py-3 font-medium">Посл. заказ</th>
                <th className="px-4 py-3 font-medium">Возвраты</th>
              </tr>
            </thead>
            <tbody>
              {clients.slice(0, 50).map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(c.id)}>
                      {selectedIds.includes(c.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{c.name}</td>
                  <td className="px-4 py-3 text-slate-900">{Math.round(c.totalSum || 0).toLocaleString("ru-RU")} ₽</td>
                  <td className="px-4 py-3 text-red-600 text-xs">{c.lastOrderDate?.toLocaleDateString("ru-RU")}</td>
                  <td className="px-4 py-3 text-slate-700">{(c.cancelRate || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}