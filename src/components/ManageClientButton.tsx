"use client";

import { useState } from "react";
import { TaskModal } from "./TaskModal";
import { ShieldAlert, MessageSquarePlus, Ban, PhoneCall } from "lucide-react";

export function ManageClientButton({ clientId, clientName, rating }: { clientId: string; clientName: string; rating: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [stopList, setStopList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/abcp/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: clientId,
          managerComment: comment,
          inStopList: stopList
        }),
      });

      // Проверяем, что ответ от нашего сервера валидный
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        throw new Error(errData.error || "Ошибка сервера");
      }

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Данные клиента обновлены в ABCP!" });
        setComment("");
        setStopList(false);
      } else {
        throw new Error(data.error || "Неизвестная ошибка");
      }
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Ошибка сохранения" 
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={`rounded-md px-2 py-1 text-xs font-medium ${
          rating === 'D' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        Управлять
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={20} className={rating === 'D' ? 'text-red-600' : 'text-blue-600'} />
              <h2 className="text-lg font-bold text-slate-900">Управление клиентом</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4 truncate">Клиент: {clientName}</p>

            {/* Быстрое действие: Поставить задачу на обзвон */}
            <div className="mb-4 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Обзвонить клиента</span>
                </div>
                <button 
                  onClick={() => setIsTaskOpen(true)} 
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Создать задачу
                </button>
              </div>
            </div>

            {/* Изменение карточки в ABCP */}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 flex items-center gap-1">
                  <MessageSquarePlus size={14} /> Комментарий в карточку ABCP
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Например: Предупредить о частых возвратах"
                />
              </div>

              {rating === 'D' && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
                  <input
                    type="checkbox"
                    id="stoplist"
                    checked={stopList}
                    onChange={(e) => setStopList(e.target.checked)}
                    className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="stoplist" className="text-sm font-medium text-red-700 flex items-center gap-1">
                    <Ban size={14} /> Добавить в Стоп-лист (блокировка отгрузок)
                  </label>
                </div>
              )}

              {message && (
                <p className={`text-xs font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {message.text}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Закрыть
                </button>
                <button type="submit" disabled={saving || (!comment && !stopList)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
                  {saving ? "Сохраняю..." : "Применить в ABCP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTaskOpen && (
        <TaskModal 
          onClose={() => setIsTaskOpen(false)} 
          onSaved={() => { setIsTaskOpen(false); setIsOpen(false); }} 
          relatedClientId={clientId} 
          relatedClientName={clientName}
        />
      )}
    </>
  );
}