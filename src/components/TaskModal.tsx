"use client";

import { useState } from "react";

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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="all">Всем менеджерам</option>
              <option value="0">Без менеджера (оператору)</option>
              {/* Сюда позже можно будет динамически подгружать список менеджеров */}
            </select>
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