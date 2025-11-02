"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import ProductDetailsClient from "../../../components/ProductDetailsClient";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/api/products/${id}`);
        if (mounted) setProduct(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card h-[60vh] skeleton" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-10 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Produto não encontrado</h1>
        <p className="mt-2 text-gray-600">Tente voltar e explorar outros produtos.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <ProductDetailsClient product={product} />
    </div>
  );
}