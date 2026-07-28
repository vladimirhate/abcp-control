"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";

type Client = {
  userId: string;
  name: string;
  organizationName: string;
  profileId: string;
  state: number | string;
  debt: number | string;
  businessName: string;
  city: string;
};

type Profile = {
  profileId: string;
  name: string;
};

// Безопасное преобразование в число
function safeNum(val: any): number {
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

const BUSINESS_TYPES = [
  { value: "1", label: "Автопарк" },
  { value: "2", label: "Автосервис" },
  { value: "3", label: "Автосервис + Магазин" },
  { value: "4", label: "Дистрибьютор" },
  { value: "5", label: "Интернет-магазин" },
  { value: "6", label: "Магазин" },
];

export function ClientsCrm({ profiles }: { profiles: Profile[] }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  const [search, setSearch] = useState("");
  const [filterProfile, setFilterProfile] = useState("");
  const [filterState, setFilterState] = useState("1");
  const [filterBusiness, setFilterBusiness] = useState("");
  
  const [bulkProfile, setBulkProfile] = useState("");
  const [bulkState, setBulkState] = useState("");
  const [bulkAction, setBulkAction] = useState(false);

  async function fetchClients() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (filterProfile) params.append("profileId", filterProfile);
    if (filterState) params.append("state", filterState);
    if (filterBusiness) params.append("business", filterBusiness);
    params.append("page", String(page));
    
    const res = await fetch(`/api/abcp/users?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      setClients(data.data);
      setHasMore(data.hasMore);
    }
    setLoading(false);
  }

  useEffect(() => {
    setPage(0);
    fetchClients();
  }, [search, filterProfile, filterState, filterBusiness]);

  useEffect(() => {
    fetchClients();
  }, [page]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === clients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map(c => c.userId));
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
    fetchClients();
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Панель фильтров */}
      <div className="border-b border-slate-200 p-4 grid gap-4 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по имени, телефону, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <select value={filterProfile} onChange={(e) => setFilterProfile(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">Все профили</option>
          {profiles.map(p => <option key={p.profileId} value={p.profileId}>{p.name}</option>)}
        </select>
        <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="1">Активные</option>
          <option value="0">Ожидают регистрации</option>
          <option value="-1">Отклоненные</option>
          <option value="2">Удаленные</option>
          <option value="">Все статусы</option>
        </select>
        <select value={filterBusiness} onChange={(e) => setFilterBusiness(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">Весь бизнес</option>
          {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>

      {/* Панель массовых действий */}
      {selectedIds.length > 0 && (
        <div className="border-b border-blue-200 bg-blue-50 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-900">Выбрано: {selectedIds.length}</span>
          <div className="flex-1" />
          <select value={bulkProfile} onChange={(e) => setBulkProfile(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
            <option value="">Профиль не меняем</option>
            {profiles.map(p => <option key={p.profileId} value={p.profileId}>{p.name}</option>)}
          </select>
          <select value={bulkState} onChange={(e) => setBulkState(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
            <option value="">Статус не меняем</option>
            <option value="1">Сделать активным</option>
            <option value="-1">Отклонить (блок)</option>
            <option value="2">Удалить</option>
          </select>
          <button onClick={applyBulkAction} disabled={bulkAction} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {bulkAction ? "Выполняю..." : "Применить к выбранным"}
          </button>
        </div>
      )}

      {/* Таблица клиентов */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Клиенты не найдены.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === clients.length && clients.length > 0 ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Профиль</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Бизнес</th>
                <th className="px-4 py-3 font-medium">Город</th>
                <th className="px-4 py-3 font-medium">Долг</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const profile = profiles.find(p => String(p.profileId) === String(c.profileId));
                const stateNum = Number(c.state);
                const debtNum = safeNum(c.debt);
                
                return (
                  <tr key={c.userId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(c.userId)}>
                        {selectedIds.includes(c.userId) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                      {c.organizationName || c.name || "Клиент " + c.userId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{profile?.name || "—"}</td>
                    <td className="px-4 py-3">
                      {stateNum === 1 && <span className="text-green-600">Активен</span>}
                      {stateNum === 0 && <span className="text-amber-600">Ожидает</span>}
                      {stateNum === -1 && <span className="text-red-600">Отклонен</span>}
                      {stateNum === 2 && <span className="text-slate-400">Удален</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{c.businessName || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{c.city || "—"}</td>
                    <td className={`px-4 py-3 font-medium ${debtNum > 0 ? "text-red-600" : "text-slate-500"}`}>
                      {debtNum.toLocaleString("ru-RU")} ₽
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between border-t border-slate-200 p-4">
        <span className="text-xs text-slate-500">Страница {page + 1}</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))} 
            disabled={page === 0 || loading}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} /> Назад
          </button>
          <button 
            onClick={() => setPage(p => p + 1)} 
            disabled={!hasMore || loading}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Вперед <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}