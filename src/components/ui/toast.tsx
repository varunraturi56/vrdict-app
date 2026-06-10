"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string };
type Listener = (toasts: Toast[]) => void;

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

/** Show a transient error/info message. Safe to call from any client code. */
export function toast(message: string, durationMs = 4000) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, durationMs);
}

export function ToastViewport() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => setItems(t);
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-lg border border-red-500/30 bg-[#0e0e14]/95 text-red-300 font-body text-xs shadow-2xl animate-fade-up"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
