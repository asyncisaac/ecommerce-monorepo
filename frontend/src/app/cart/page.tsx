"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import SafeImage from "../../components/SafeImage";
import { useToast } from "../../components/ToastProvider";
import Link from "next/link";

type CartItem = {
  id: string;
  quantity: number;
  variantId?: string | null;
  product: {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    discount?: number | string;
    images?: string[];
    variants?: { id: string; name: string; price?: number }[];
  };
};

export default function CartPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<{ itemsCount: number; subtotal: number; discountTotal: number; total: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [c, s] = await Promise.all([api.get("/api/cart"), api.get("/api/cart/summary")]);
      setItems(c.data.items || []);
      setSummary(s.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message;
      if (err?.response?.status === 401) {
        setError("Faça login para ver sua sacola");
      } else {
        setError(msg || "Erro ao carregar sacola");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    try {
      await api.patch(`/api/cart/items/${itemId}`, { quantity });
      addToast({ type: "success", message: "Quantidade atualizada" });
      await load();
    } catch (err: any) {
      addToast({ type: "error", message: err?.response?.data?.error || "Erro ao atualizar" });
    }
  }

  async function removeItem(itemId: string) {
    try {
      await api.delete(`/api/cart/items/${itemId}`);
      addToast({ type: "success", message: "Item removido" });
      await load();
    } catch (err: any) {
      addToast({ type: "error", message: err?.response?.data?.error || "Erro ao remover" });
    }
  }

  async function checkout() {
    try {
      setCheckoutLoading(true);
      const res = await api.post("/api/checkout", {});
      const orderIdRaw = (res?.data as { id?: unknown } | undefined)?.id;
      const orderId =
        typeof orderIdRaw === "string" && orderIdRaw.trim() !== "" && orderIdRaw !== "undefined" && orderIdRaw !== "null"
          ? orderIdRaw
          : undefined;
      addToast({ type: "success", message: "Pedido criado com sucesso" });
      window.location.href = orderId ? `/orders/${orderId}` : "/orders";
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Erro ao finalizar compra";
      addToast({ type: "error", message: msg });
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card h-28 skeleton" />
            ))}
          </div>
          <div className="card h-48 skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-black/70 dark:text-white/70 mb-4">{error}</p>
        {error.includes("login") && (
          <Link href="/login" className="btn-primary">Entrar</Link>
        )}
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Sacola</h1>
      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-black/70 dark:text-white/70">Sua sacola está vazia.</p>
          <Link href="/products" className="btn-primary mt-4">Explorar produtos</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Lista de itens */}
          <div className="md:col-span-2 space-y-6">
            {items.map((item) => {
              const variant = item.variantId ? item.product.variants?.find((v) => v.id === item.variantId) : null;
              const price = Number(item.product.price);
              const discount = Number(item.product.discount ?? 0);
              const unitBase = Number(variant?.price ?? price);
              const unitFinal = unitBase - unitBase * (discount / 100);
              const total = unitFinal * item.quantity;
              const cover = item.product.images?.[0] || "/placeholder.svg";
              return (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border border-black/10 dark:border-white/15">
                    <SafeImage src={cover} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        {variant && <div className="text-sm text-black/60 dark:text-white/60">{variant.name}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                        {discount > 0 && (
                          <div className="text-xs text-black/50 dark:text-white/50 line-through">
                            {(unitBase * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Stepper minimal */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button className="h-8 w-8 rounded-full border border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button>
                        <span>{item.quantity}</span>
                        <button className="h-8 w-8 rounded-full border border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <button className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white" onClick={() => removeItem(item.id)}>Remover</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-black/60 dark:text-white/60">Itens</span>
                <span className="font-medium">{summary?.itemsCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-black/60 dark:text-white/60">Subtotal</span>
                <span className="font-medium">{(summary?.subtotal ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-black/60 dark:text-white/60">Descontos</span>
                <span className="font-medium">{(summary?.discountTotal ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-semibold">{(summary?.total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>

              <button className="btn-primary w-full mt-5" disabled={checkoutLoading} onClick={checkout}>
                {checkoutLoading ? "Finalizando..." : "Finalizar compra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
