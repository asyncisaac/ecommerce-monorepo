"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type Order = {
  id: string;
  status: string;
  total: number | string;
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/orders")
      .then((res) => setOrders(res.data || []))
      .catch((err) => {
        if (err?.response?.status === 401) setError("Faça login para ver seus pedidos.");
        else setError(err?.response?.data?.error || "Erro ao carregar pedidos");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container-page py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Link href="/products" className="btn-secondary">Continuar comprando</Link>
      </div>

      {loading && <div className="card p-6 skeleton h-28" />}
      {error && <div className="card p-6 text-black/70 dark:text-white/70">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="card p-6 text-black/70 dark:text-white/70">Você ainda não tem pedidos.</div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="card divide-y divide-black/10 dark:divide-white/10">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between p-5 hover:bg-black/5 dark:hover:bg-white/10">
              <div>
                <div className="font-medium">Pedido #{o.id.slice(0, 8)}</div>
                <div className="text-sm text-black/60 dark:text-white/60">{new Date(o.createdAt).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-black/60 dark:text-white/60">{o.status}</div>
                <div className="font-semibold">
                  {Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
