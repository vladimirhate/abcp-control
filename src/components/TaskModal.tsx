"use client";

import { useState, useEffect } from "react";

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export function TaskModal({ onClose, onSaved, relatedClientId, relatedClientName }: { 
  onClose: () => void; 
  onSaved: () => void;
  relatedClientId?: string;
  relatedClientName?: string;
}) {
  const [title, setTitle] = useState(relatedClientName ? `Связаться с клиентом: ${relatedClientName}` : "");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("all");
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);

  // Загружаем список менеджеров при открытии окна
  useEffect(() => {
    async function fetchManagers() {
      try {
        const res = await fetch("/api/abcp/managers");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setManagers(data.data);
        }
      } catch (e) {
        console.error("Не удалось загрузить менеджеров", e);
      } finally {
        setLoadingManagers(false);
      }
    }
    fetchManagers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        assigned_to: assignedTo,
        related_client_id: relatedClientId,
        related_client_name: relatedClientName,
      }),
    });

    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Новая задача</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Что нужно сделать?</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Например: Обзвонить клиента"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Поручить кому?</label>
            <select 
              value={assignedTo} 
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={loadingManagers}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 disabled:bg-slate-50"
            >
              <option value="all">Всем менеджерам</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>
                  {(m.firstName + " " + m.lastName).trim() || m.email}
                </option>
              ))}
            </select>
            {loadingManagers && <p className="mt-1 text-xs text-slate-400">Загрузка сотрудников...</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Комментарий</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Детали задачи..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Сохраняю..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}