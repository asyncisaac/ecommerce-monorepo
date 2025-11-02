import Hero from "../components/Hero";
import { ProductCard } from "../components/ProductCard";
import SearchFilters from "../components/SearchFilters";

type ProductList = { products: any[] };
async function fetchProducts(params?: Record<string, string>): Promise<ProductList> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";
  const qs = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${base}/api/products${qs}`, {
    next: { revalidate: 60 },
    headers: { "x-request-id": "frontend-home" },
  });
  if (!res.ok) return { products: [] };
  return res.json();
}

export default async function Home({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const params: Record<string, string> = {};
  const q = typeof searchParams?.q === "string" ? searchParams?.q : undefined;
  const category = typeof searchParams?.category === "string" ? searchParams?.category : undefined;
  const sort = typeof searchParams?.sort === "string" ? searchParams?.sort : undefined;
  if (q) params.q = q;
  if (category) params.category = category;
  if (sort) params.sort = sort;
  const { products = [] } = await fetchProducts(params);
  return (
    <main>
      <Hero />
      <section id="destaques" className="container-page py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-black">Destaques</h2>
          {/** Filtros discretos */}
          {/** @ts-expect-error RSC render client component */}
          <SearchFilters />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.length === 0 && (
            <>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-[360px]" />
              ))}
            </>
          )}
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
