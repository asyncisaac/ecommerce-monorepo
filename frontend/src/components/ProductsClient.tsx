"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductSkeleton";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category?: { name: string } | string;
}

interface ProductsClientProps {
  initialProducts?: Product[];
  searchParams?: Record<string, string>;
}

export default function ProductsClient({ initialProducts = [], searchParams = {} }: ProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        const response = await api.get(`/api/products?${params.toString()}`);
        setProducts(response.data.products || []);
      } catch {
        setError("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    }

    // Se não há produtos iniciais ou se os parâmetros mudaram, buscar novos
    if (initialProducts.length === 0 || Object.keys(searchParams).length > 0) {
      fetchProducts();
    }
  }, [searchParams, initialProducts.length]);

  if (loading) {
    return <ProductGridSkeleton count={6} />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-black dark:text-white mb-2">Ops! Algo deu errado</h3>
        <p className="text-black/60 dark:text-white/70 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-black/40 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9h.01M15 9h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-black dark:text-white mb-2">Nenhum produto encontrado</h3>
        <p className="text-black/60 dark:text-white/70 mb-4">Tente ajustar os filtros ou explore outras categorias.</p>
        <a 
          href="/products" 
          className="btn-primary"
        >
          Ver todos os produtos
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
