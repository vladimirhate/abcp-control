"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { TaskModal } from "@/components/TaskModal";
import { CheckSquare, Plus, Check } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  related_client_name: string | null;
  status: string;
  created_at: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (data.success) setTasks(data.data);
    setLoading(false);
  }

  async function closeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    fetchTasks();
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <CheckSquare size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Задачи</h1>
              <p className="mt-1 text-sm text-slate-500">Поручения сотрудникам и контроль исполнения</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Поставить задачу
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Загрузка...</div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Задач пока нет.</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className={`rounded-xl border bg-white p-5 shadow-sm ${task.status === 'done' ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-semibold text-slate-900 ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h3>
                    {task.related_client_name && <p className="text-xs text-slate-500 mt-1">Клиент: {task.related_client_name}</p>}
                    {task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}
                  </div>
                  {task.status !== 'done' && (
                    <button 
                      onClick={() => closeTask(task.id)}
                      className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      <Check size={14} /> Выполнено
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <TaskModal onClose={() => setIsModalOpen(false)} onSaved={fetchTasks} />
      )}
    </AppLayout>
  );
}