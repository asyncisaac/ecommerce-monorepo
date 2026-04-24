"use client";
import { useState } from "react";
import { api } from "../lib/api";

type Variant = { id: string; name?: string; color?: string; size?: string; price?: number };

export default function AddToCart({ productId, variants = [] as Variant[] }: { productId: string; variants?: Variant[] }) {
  const [variantId, setVariantId] = useState<string | undefined>(variants[0]?.id);
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<{ type: "idle"|"success"|"error"; message?: string }>({ type: "idle" });
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    setStatus({ type: "idle" });
    try {
      await api.post("/api/cart/items", { productId, quantity, variantId });
      setStatus({ type: "success", message: "Adicionado à sacola" });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Erro ao adicionar";
      // Se não autenticado, mensagem amigável
      if (e?.response?.status === 401) {
        setStatus({ type: "error", message: "Faça login para adicionar à sacola" });
      } else {
        setStatus({ type: "error", message: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-black/70 dark:text-white/70">Variante</label>
          <select
            className="border border-black/10 dark:border-white/15 bg-white dark:bg-white/10 rounded-md px-2 py-1 text-sm outline-none dark:text-white"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name || `${v.color ?? ""} ${v.size ?? ""}`.trim() || "Opção"}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="text-sm text-black/70 dark:text-white/70">Qtd</label>
        <input
          type="number"
          min={1}
          className="border border-black/10 dark:border-white/15 bg-white dark:bg-white/10 rounded-md px-2 py-1 w-20 text-sm outline-none dark:text-white"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={loading}
        className="btn-primary disabled:opacity-60"
      >
        {loading ? "Adicionando..." : "Adicionar à sacola"}
      </button>
      {status.type !== "idle" && (
        <p className={status.type === "success" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {status.message}
        </p>
      )}
    </div>
  );
}
