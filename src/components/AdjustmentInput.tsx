"use client";

import { useState } from "react";

export function AdjustmentInput({ managerId, month, initialAmount, initialReason }: { managerId: string; month: string; initialAmount: number; initialReason?: string }) {
  const [amount, setAmount] = useState(String(initialAmount || 0));
  const [reason, setReason] = useState(initialReason || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  async function save() {
    setSaving(true);
    setStatus("idle");
    await fetch("/api/salary-adjustments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId, month, amount: Number(amount), reason })
    });
    setSaving(false);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-1 w-40">
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
          placeholder="0"
        />
        <button 
          onClick={save} 
          disabled={saving} 
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
        >
          {saving ? "..." : "OK"}
        </button>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
        placeholder="Причина (напр. Больничный)"
      />
      {status === "saved" && <span className="text-[10px] text-green-600">Сохранено!</span>}
    </div>
  );
}