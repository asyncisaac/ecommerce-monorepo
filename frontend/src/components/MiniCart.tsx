"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { BagIcon } from "./icons";

type Summary = {
  itemsCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
};

export default function MiniCart() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [auth, setAuth] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function formatMoney(value: number, currency: string) {
    if (currency === "BRL") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return value.toFixed(2);
  }

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await api.get("/api/cart/summary");
      setSummary(res.data);
      setAuth(true);
    } catch (err: any) {
      if (err?.response?.status === 401) setAuth(false);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchSummary();
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" aria-label="Sacola">
        <BagIcon />
        {summary?.itemsCount ? (
          <span className="absolute -top-1 -right-1 bg-black text-white dark:bg-white dark:text-black text-[10px] leading-4 px-1 rounded-full">
            {summary.itemsCount}
          </span>
        ) : null}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-black/10 bg-white shadow-lg p-3 dark:border-white/15 dark:bg-black/80 backdrop-blur">
          {!auth && (
            <p className="text-sm text-black/70 dark:text-white/70">Faça login para visualizar sua sacola.</p>
          )}
          {auth && loading && (
            <p className="text-sm text-black/70 dark:text-white/70">Carregando…</p>
          )}
          {auth && !loading && summary && summary.itemsCount === 0 && (
            <div className="space-y-2 text-sm">
              <p className="text-black/70 dark:text-white/70">Sua sacola está vazia.</p>
              <div className="pt-1">
                <a href="/products" className="btn-primary w-full">
                  Explorar produtos
                </a>
              </div>
            </div>
          )}
          {auth && !loading && summary && summary.itemsCount > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-black/70 dark:text-white/70">Itens</span>
                <span className="text-black dark:text-white font-medium">{summary.itemsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/70 dark:text-white/70">Subtotal</span>
                <span className="text-black dark:text-white font-medium">
                  {formatMoney(summary.subtotal, summary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/70 dark:text-white/70">Descontos</span>
                <span className="text-black dark:text-white font-medium">- {formatMoney(summary.discountTotal, summary.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/90 dark:text-white font-medium">Total</span>
                <span className="text-black dark:text-white font-semibold">
                  {formatMoney(summary.total, summary.currency)}
                </span>
              </div>
              <div className="pt-2">
                <a href="/cart" className="btn-primary w-full">
                  Ir para sacola
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
