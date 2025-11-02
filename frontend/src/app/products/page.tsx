import SearchFilters from "../../components/SearchFilters";
import ProductsClient from "../../components/ProductsClient";

type ProductList = { products: any[] };
async function fetchProducts(params?: Record<string, string>): Promise<ProductList> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";
  const qs = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
  try {
    const res = await fetch(`${base}/api/products${qs}`, {
      next: { revalidate: 30 },
      headers: { "x-request-id": "frontend-products" },
    });
    if (!res.ok) return { products: [] };
    return res.json();
  } catch {
    return { products: [] };
  }
}

export default async function Products({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-black">Produtos</h1>
          {/** @ts-expect-error RSC render client component */}
          <SearchFilters />
        </div>
        <div className="mt-6">
          <ProductsClient initialProducts={products} searchParams={params} />
        </div>
      </section>
    </main>
  );
}