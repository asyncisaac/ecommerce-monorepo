"use client";
import { useMemo, useState } from "react";
import SafeImage from "./SafeImage";
import { useToast } from "./ToastProvider";
import { api } from "../lib/api";

type Variant = { id: string; name: string; price?: number };
type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  imageUrl?: string | null;
  images?: string[];
  variants?: Variant[];
};

export default function ProductDetailsClient({ product }: { product: Product }) {
  const { addToast } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const finalPrice = useMemo(() => {
    const base = selectedVariantId
      ? product.variants?.find((v) => v.id === selectedVariantId)?.price ?? product.price
      : product.price;
    const discountPct = product.discount ?? 0;
    const discountValue = (base * discountPct) / 100;
    return base - discountValue;
  }, [selectedVariantId, product]);

  async function onAddToCart() {
    try {
      setLoading(true);
      await api.post("/api/cart/items", {
        productId: product.id,
        quantity,
        variantId: selectedVariantId,
      });
      addToast({ type: "success", message: "Adicionado à sacola" });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Não foi possível adicionar";
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const [currentImage, setCurrentImage] = useState<string | undefined>(() => {
    if (product.images && product.images.length > 0) return product.images[0];
    return product.imageUrl || undefined;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Imagem grande à esquerda com hover zoom */}
      <div>
        <div className="group rounded-2xl overflow-hidden ring-1 ring-black/10 bg-white dark:bg-white/5 dark:ring-white/15">
          <SafeImage
            src={currentImage || "/placeholder.svg"}
            alt={product.name}
            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        {product.images && product.images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {product.images.slice(0, 6).map((img) => (
              <button
                key={img}
                type="button"
                onClick={() => setCurrentImage(img)}
                className={`h-14 w-14 rounded-xl overflow-hidden border ${
                  currentImage === img
                    ? "border-black dark:border-white"
                    : "border-black/10 dark:border-white/15"
                }`}
                aria-label="Escolher imagem"
              >
                <SafeImage src={img} alt={product.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Informações à direita */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{product.name}</h1>
          {product.description && (
            <p className="mt-3 text-black/60 dark:text-white/70 text-lg leading-relaxed">{product.description}</p>
          )}
        </div>

        {/* Preço em destaque */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold">{finalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          {(product.discount ?? 0) > 0 && (
            <span className="text-black/50 dark:text-white/50 line-through">
              {(
                (selectedVariantId
                  ? product.variants?.find((v) => v.id === selectedVariantId)?.price ?? product.price
                  : product.price)
              ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          )}
        </div>

        {/* Segmented control de variantes */}
        {product.variants && product.variants.length > 0 && (
          <div>
            <div className="text-sm text-black/60 dark:text-white/60 mb-2">Selecione a opção</div>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const active = selectedVariantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`rounded-full px-4 py-2 text-sm border transition ${
                      active
                        ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                        : "bg-white text-black border-black/20 hover:border-black/30 dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:border-white/30"
                    }`}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantidade + Comprar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center">{quantity}</span>
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            disabled={loading}
            className="btn-primary px-6 h-11 disabled:opacity-60"
          >
            {loading ? "Adicionando…" : "Comprar"}
          </button>
        </div>
      </div>
    </div>
  );
}
