import SearchFilters from "../../components/SearchFilters";
import { ProductCard } from "../../components/ProductCard";

type ProductList = { products: any[] };
async function fetchProducts(params?: Record<string, string>): Promise<ProductList> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";
  const qs = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${base}/api/products${qs}`, {
    next: { revalidate: 15 },
    headers: { "x-request-id": "frontend-search" },
  });
  if (!res.ok) return { products: [] };
  return res.json();
}

export default async function SearchPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
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
      <section className="container-page py-10">
        <div className="rounded-2xl overflow-hidden" style={{ background: "radial-gradient(1200px 400px at 20% 0%, #f2f2f2 0%, #e8e8e8 45%, #dcdcdc 100%)" }}>
          <div className="px-8 py-10 md:px-16 md:py-14">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-black">Buscar produtos</h1>
            <p className="mt-2 text-black/60">Encontre produtos por nome, categoria e ordene do jeito que preferir.</p>
            <div className="mt-6">
              {/** @ts-expect-error RSC render client component */}
              <SearchFilters />
            </div>
          </div>
        </div>
        <div className="mt-8">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-black mb-2">
                {q ? `Nenhum resultado para "${q}"` : "Explore nossos produtos"}
              </h3>
              <p className="text-black/60 mb-6 max-w-md mx-auto">
                {q 
                  ? "Tente ajustar os filtros ou buscar por outros termos." 
                  : "Use os filtros acima para encontrar exatamente o que procura."
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="/products" 
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-black/90 transition-colors"
                >
                  Ver todos os produtos
                </a>
                <a 
                  href="/" 
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-black/5 text-black rounded-full font-medium hover:bg-black/10 transition-colors"
                >
                  Voltar ao início
                </a>
              </div>
              {!q && (
                <div className="mt-8 pt-6 border-t border-black/10">
                  <p className="text-sm text-black/50 mb-3">Categorias populares:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <a href="/search?category=Eletrônicos" className="px-3 py-1.5 text-xs bg-black/5 text-black/70 rounded-full hover:bg-black/10 transition-colors">
                      Eletrônicos
                    </a>
                    <a href="/search?category=Roupas" className="px-3 py-1.5 text-xs bg-black/5 text-black/70 rounded-full hover:bg-black/10 transition-colors">
                      Roupas
                    </a>
                    <a href="/search?category=Livros" className="px-3 py-1.5 text-xs bg-black/5 text-black/70 rounded-full hover:bg-black/10 transition-colors">
                      Livros
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}