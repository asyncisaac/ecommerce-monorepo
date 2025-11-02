"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };
type ToastContextType = { addToast: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    // auto remove after 3.2s
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full px-4 py-2 text-sm shadow-md transition-all duration-200 ${
              t.type === "success"
                ? "bg-black text-white"
                : t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-black text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}