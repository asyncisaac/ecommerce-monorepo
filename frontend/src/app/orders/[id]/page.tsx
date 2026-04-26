"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";

type OrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  product: { id: string; name: string };
};

type Order = {
  id: string;
  status: string;
  total: number | string;
  createdAt: string;
  items: OrderItem[];
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const invalidId = !id || id === "undefined" || id === "null";

  async function loadOrder(orderId: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/orders/${orderId}`);
      setOrder(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) setError("Faça login para ver este pedido.");
      else setError(err?.response?.data?.error || "Erro ao carregar pedido");
    } finally {
      setLoading(false);
    }
  }

  async function payNow() {
    if (!order) return;
    try {
      setPayLoading(true);
      const res = await api.post(`/api/orders/${order.id}/pay`, {});
      const checkoutUrlRaw = (res?.data as { checkoutUrl?: unknown } | undefined)?.checkoutUrl;
      const checkoutUrl =
        typeof checkoutUrlRaw === "string" && checkoutUrlRaw.trim() !== "" && checkoutUrlRaw !== "undefined" && checkoutUrlRaw !== "null"
          ? checkoutUrlRaw
          : undefined;
      if (!checkoutUrl) {
        addToast({ type: "error", message: "Não foi possível iniciar o pagamento" });
        return;
      }
      window.location.href = checkoutUrl;
    } catch (err: any) {
      addToast({ type: "error", message: err?.response?.data?.error || "Erro ao iniciar pagamento" });
    } finally {
      setPayLoading(false);
    }
  }

  useEffect(() => {
    if (invalidId) return;

    void loadOrder(id);
  }, [id, invalidId]);

  if (invalidId) {
    return (
      <main className="container-page py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Pedido</h1>
            <div className="text-sm text-black/60 dark:text-white/60">{id}</div>
          </div>
          <Link href="/orders" className="btn-secondary">Voltar</Link>
        </div>
        <div className="card p-6 text-black/70 dark:text-white/70">Pedido inválido.</div>
      </main>
    );
  }

  return (
    <main className="container-page py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pedido</h1>
          <div className="text-sm text-black/60 dark:text-white/60">{id}</div>
        </div>
        <Link href="/orders" className="btn-secondary">Voltar</Link>
      </div>

      {loading && <div className="card p-6 skeleton h-28" />}
      {error && <div className="card p-6 text-black/70 dark:text-white/70">{error}</div>}

      {!loading && !error && order && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="card divide-y divide-black/10 dark:divide-white/10">
              {order.items?.map((it) => (
                <div key={it.id} className="p-5 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.product?.name ?? "Produto"}</div>
                    <div className="text-sm text-black/60 dark:text-white/60">Qtd: {it.quantity}</div>
                  </div>
                  <div className="font-semibold">
                    {(Number(it.price) * it.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:sticky md:top-24 md:self-start">
            <div className="card p-5">
              {(() => {
                const showPay = order.status === "PENDING";
                return (
                  <>
              <div className="flex items-center justify-between">
                <span className="text-black/60 dark:text-white/60">Status</span>
                <span className="font-medium">{order.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-black/60 dark:text-white/60">Criado em</span>
                <span className="font-medium">{new Date(order.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-semibold">
                  {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              {order.status === "PENDING" && (
                <button className="btn-primary w-full mt-5" disabled={payLoading} onClick={payNow}>
                  {payLoading ? "Abrindo pagamento..." : "Pagar agora"}
                </button>
              )}
              <Link href="/products" className={`${showPay ? "btn-secondary mt-3" : "btn-primary mt-5"} w-full`}>Comprar mais</Link>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
