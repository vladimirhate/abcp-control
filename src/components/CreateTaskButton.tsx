"use client";

import { useState } from "react";
import { TaskModal } from "./TaskModal";

export function CreateTaskButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        + Задача
      </button>
      {isOpen && (
        <TaskModal 
          onClose={() => setIsOpen(false)} 
          onSaved={() => setIsOpen(false)} 
          relatedClientId={clientId} 
          relatedClientName={clientName}
        />
      )}
    </>
  );
}