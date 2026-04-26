import Link from "next/link";
import SafeImage from "./SafeImage";

export function ProductCard({ product }: { product: any }) {
  const cover = (product.images && product.images[0]) || "/placeholder.svg";
  const category = product.category?.name || product.category || null;
  const price = Number(product.price ?? 0);
  const discountPct = Number(product.discount ?? 0);
  const finalPrice = discountPct > 0 ? price - price * (discountPct / 100) : price;
  return (
    <Link href={`/product/${product.id}`} className="group block card-hover">
      <div className="relative overflow-hidden rounded-2xl bg-[#f7f7f7] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/15">
        {discountPct > 0 && (
          <div className="absolute left-3 top-3 z-10">
            <span className="inline-flex items-center rounded-full bg-black px-2 py-1 text-[11px] font-medium text-white dark:bg-white dark:text-black">
              -{discountPct}%
            </span>
          </div>
        )}
        <SafeImage
          src={cover}
          alt={product.name}
          className="w-full h-[320px] object-cover transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>
      <div className="pt-3">
        {category && (
          <span className="inline-block text-[11px] px-2 py-1 rounded-full bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/70">
            {category}
          </span>
        )}
        <h3 className="mt-1 text-[17px] font-medium text-black dark:text-white group-hover:underline underline-offset-4">{product.name}</h3>
        <p className="text-black/60 dark:text-white/70 text-sm line-clamp-2">{product.description}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-[15px] font-semibold text-black dark:text-white">
            {finalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          {discountPct > 0 && (
            <div className="text-xs text-black/50 dark:text-white/50 line-through">
              {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
