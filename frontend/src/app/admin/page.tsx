"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../components/AuthProvider";
import { useToast } from "../../components/ToastProvider";

type Category = { id: string; name: string; slug: string };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  stock: number;
  images: string[];
  slug: string;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
};

type ProductListResponse = {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

function normalizeImages(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const { loading, user } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"categories" | "products">("categories");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "0",
    discount: "0",
    stock: "0",
    images: "",
    categoryId: "",
  });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<{ name: string; slug: string } | null>(null);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<{
    name: string;
    description: string;
    price: string;
    discount: string;
    stock: string;
    images: string;
    categoryId: string;
  } | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadCategories = useCallback(async () => {
    const res = await api.get("/api/categories");
    setCategories((res.data ?? []) as Category[]);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await api.get("/api/products", { params: { limit: 100, page: 1, sort: "recent" } });
    const data = res.data as ProductListResponse;
    setProducts(data?.products ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadProducts()]);
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshAll().catch(() => {
      addToast({ type: "error", message: "Erro ao carregar dados do admin" });
    });
  }, [isAdmin, addToast, refreshAll]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  if (loading) {
    return (
      <main className="container-page py-10">
        <div className="skeleton h-10 w-56" />
        <div className="mt-6 skeleton h-40" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container-page py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Admin</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Você precisa estar logado para acessar o painel.
        </p>
        <Link href="/login" className="inline-flex mt-6 btn-primary">
          Entrar
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container-page py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Admin</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Sua conta não tem permissão para acessar esta página.
        </p>
        <Link href="/" className="inline-flex mt-6 btn-primary">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <main className="container-page py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Admin</h1>
          <p className="mt-1 text-black/60 dark:text-white/60 text-sm">
            Gerencie categorias e produtos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
              tab === "categories"
                ? "bg-black text-white ring-black"
                : "bg-transparent text-black ring-black/10 hover:bg-black/5 dark:text-white dark:ring-white/15 dark:hover:bg-white/10"
            }`}
            onClick={() => setTab("categories")}
          >
            Categorias
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
              tab === "products"
                ? "bg-black text-white ring-black"
                : "bg-transparent text-black ring-black/10 hover:bg-black/5 dark:text-white dark:ring-white/15 dark:hover:bg-white/10"
            }`}
            onClick={() => setTab("products")}
          >
            Produtos
          </button>
        </div>
      </div>

      {tab === "categories" ? (
        <section className="mt-8">
          <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/15 p-5">
            <h2 className="text-lg font-semibold text-black dark:text-white">Criar categoria</h2>
            <div className="mt-3 flex flex-col md:flex-row gap-3 md:items-center">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="w-full md:w-96 rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <button
                className="btn-primary"
                disabled={busy || !newCategoryName.trim()}
                onClick={async () => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  setBusy(true);
                  try {
                    const res = await api.post("/api/admin/categories", { name });
                    setCategories((prev) => [res.data as Category, ...prev]);
                    setNewCategoryName("");
                    addToast({ type: "success", message: "Categoria criada" });
                  } catch (e: any) {
                    const message = e?.response?.data?.error ?? "Erro ao criar categoria";
                    addToast({ type: "error", message });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Criar
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl ring-1 ring-black/10 dark:ring-white/15 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-black/5 dark:bg-white/10 text-xs font-medium text-black/70 dark:text-white/70">
              <div className="col-span-5">Nome</div>
              <div className="col-span-5">Slug</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {categories.map((c) => {
                const isEditing = editingCategoryId === c.id && categoryDraft;
                return (
                  <div key={c.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center">
                    <div className="col-span-5">
                      {isEditing ? (
                        <input
                          value={categoryDraft.name}
                          onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })}
                          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                        />
                      ) : (
                        <div className="text-sm font-medium text-black dark:text-white">{c.name}</div>
                      )}
                    </div>
                    <div className="col-span-5">
                      {isEditing ? (
                        <input
                          value={categoryDraft.slug}
                          onChange={(e) => setCategoryDraft({ ...categoryDraft, slug: e.target.value })}
                          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                        />
                      ) : (
                        <div className="text-sm text-black/70 dark:text-white/70">{c.slug}</div>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            className="rounded-full px-3 py-2 text-sm font-medium bg-black text-white hover:bg-black/90 disabled:opacity-60"
                            disabled={busy || !categoryDraft.name.trim()}
                            onClick={async () => {
                              if (!categoryDraft) return;
                              setBusy(true);
                              try {
                                const payload: any = {
                                  name: categoryDraft.name.trim(),
                                  slug: categoryDraft.slug.trim(),
                                };
                                const res = await api.patch(`/api/admin/categories/${c.id}`, payload);
                                const updated = res.data as Category;
                                setCategories((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
                                setEditingCategoryId(null);
                                setCategoryDraft(null);
                                addToast({ type: "success", message: "Categoria atualizada" });
                              } catch (e: any) {
                                const message = e?.response?.data?.error ?? "Erro ao atualizar categoria";
                                addToast({ type: "error", message });
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Salvar
                          </button>
                          <button
                            className="rounded-full px-3 py-2 text-sm font-medium bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                            disabled={busy}
                            onClick={() => {
                              setEditingCategoryId(null);
                              setCategoryDraft(null);
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-full px-3 py-2 text-sm font-medium bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                            disabled={busy}
                            onClick={() => {
                              setEditingCategoryId(c.id);
                              setCategoryDraft({ name: c.name, slug: c.slug });
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-full px-3 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-600/90 disabled:opacity-60"
                            disabled={busy}
                            onClick={async () => {
                              if (!confirm(`Remover categoria "${c.name}"?`)) return;
                              setBusy(true);
                              try {
                                await api.delete(`/api/admin/categories/${c.id}`);
                                setCategories((prev) => prev.filter((x) => x.id !== c.id));
                                addToast({ type: "success", message: "Categoria removida" });
                              } catch (e: any) {
                                const message = e?.response?.data?.error ?? "Erro ao remover categoria";
                                addToast({ type: "error", message });
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Remover
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/15 p-5">
            <h2 className="text-lg font-semibold text-black dark:text-white">Criar produto</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="Preço (ex: 199.90)"
                inputMode="decimal"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <input
                value={productForm.discount}
                onChange={(e) => setProductForm((p) => ({ ...p, discount: e.target.value }))}
                placeholder="Desconto % (0-100)"
                inputMode="numeric"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <input
                value={productForm.stock}
                onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="Estoque"
                inputMode="numeric"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <input
                value={productForm.images}
                onChange={(e) => setProductForm((p) => ({ ...p, images: e.target.value }))}
                placeholder="Imagens (URLs separadas por vírgula)"
                className="w-full rounded-full border border-black/10 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25 md:col-span-2"
              />
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descrição"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25 md:col-span-2 min-h-28"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                className="btn-primary"
                disabled={busy || !productForm.name.trim() || !productForm.description.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const payload = {
                      name: productForm.name.trim(),
                      description: productForm.description.trim(),
                      price: Number(productForm.price),
                      discount: Number(productForm.discount),
                      stock: Number(productForm.stock),
                      images: normalizeImages(productForm.images),
                      categoryId: productForm.categoryId || null,
                    };
                    const res = await api.post("/api/admin/products", payload);
                    const created = res.data as Product;
                    const c = created.categoryId ? categoryById.get(created.categoryId) : undefined;
                    setProducts((prev) => [{ ...created, category: c }, ...prev]);
                    setProductForm({ name: "", description: "", price: "0", discount: "0", stock: "0", images: "", categoryId: "" });
                    addToast({ type: "success", message: "Produto criado" });
                  } catch (e: any) {
                    const message = e?.response?.data?.error ?? "Erro ao criar produto";
                    addToast({ type: "error", message });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Criar
              </button>
              <button
                className="rounded-full px-4 py-2 text-sm font-medium bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await refreshAll();
                    addToast({ type: "success", message: "Lista atualizada" });
                  } catch {
                    addToast({ type: "error", message: "Erro ao atualizar lista" });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Recarregar
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl ring-1 ring-black/10 dark:ring-white/15 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-black/5 dark:bg-white/10 text-xs font-medium text-black/70 dark:text-white/70">
              <div className="col-span-5">Produto</div>
              <div className="col-span-3">Categoria</div>
              <div className="col-span-2">Preço</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {products.map((p) => {
                const isEditing = editingProductId === p.id && productDraft;
                const categoryName = p.category?.name ?? (p.categoryId ? categoryById.get(p.categoryId)?.name : undefined) ?? "—";
                return (
                  <div key={p.id} className="px-5 py-3">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        {isEditing ? (
                          <input
                            value={productDraft.name}
                            onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                            className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                          />
                        ) : (
                          <>
                            <div className="text-sm font-medium text-black dark:text-white">{p.name}</div>
                            <div className="text-xs text-black/60 dark:text-white/60">{p.slug}</div>
                          </>
                        )}
                      </div>
                      <div className="col-span-3">
                        {isEditing ? (
                          <select
                            value={productDraft.categoryId}
                            onChange={(e) => setProductDraft({ ...productDraft, categoryId: e.target.value })}
                            className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                          >
                            <option value="">Sem categoria</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-black/70 dark:text-white/70">{categoryName}</div>
                        )}
                      </div>
                      <div className="col-span-2">
                        {isEditing ? (
                          <input
                            value={productDraft.price}
                            onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })}
                            inputMode="decimal"
                            className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                          />
                        ) : (
                          <div className="text-sm text-black dark:text-white">R$ {Number(p.price).toFixed(2)}</div>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              className="rounded-full px-3 py-2 text-sm font-medium bg-black text-white hover:bg-black/90 disabled:opacity-60"
                              disabled={busy || !productDraft.name.trim() || !productDraft.description.trim()}
                              onClick={async () => {
                                if (!productDraft) return;
                                setBusy(true);
                                try {
                                  const payload = {
                                    name: productDraft.name.trim(),
                                    description: productDraft.description.trim(),
                                    price: Number(productDraft.price),
                                    discount: Number(productDraft.discount),
                                    stock: Number(productDraft.stock),
                                    images: normalizeImages(productDraft.images),
                                    categoryId: productDraft.categoryId || null,
                                  };
                                  const res = await api.patch(`/api/admin/products/${p.id}`, payload);
                                  const updated = res.data as Product;
                                  const c = updated.categoryId ? categoryById.get(updated.categoryId) : undefined;
                                  setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...updated, category: c } : x)));
                                  setEditingProductId(null);
                                  setProductDraft(null);
                                  addToast({ type: "success", message: "Produto atualizado" });
                                } catch (e: any) {
                                  const message = e?.response?.data?.error ?? "Erro ao atualizar produto";
                                  addToast({ type: "error", message });
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Salvar
                            </button>
                            <button
                              className="rounded-full px-3 py-2 text-sm font-medium bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                              disabled={busy}
                              onClick={() => {
                                setEditingProductId(null);
                                setProductDraft(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="rounded-full px-3 py-2 text-sm font-medium bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                              disabled={busy}
                              onClick={() => {
                                setEditingProductId(p.id);
                                setProductDraft({
                                  name: p.name,
                                  description: p.description,
                                  price: String(p.price),
                                  discount: String(p.discount ?? 0),
                                  stock: String(p.stock ?? 0),
                                  images: (p.images ?? []).join(", "),
                                  categoryId: p.categoryId ?? "",
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-full px-3 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-600/90 disabled:opacity-60"
                              disabled={busy}
                              onClick={async () => {
                                if (!confirm(`Remover produto "${p.name}"?`)) return;
                                setBusy(true);
                                try {
                                  await api.delete(`/api/admin/products/${p.id}`);
                                  setProducts((prev) => prev.filter((x) => x.id !== p.id));
                                  addToast({ type: "success", message: "Produto removido" });
                                } catch (e: any) {
                                  const message = e?.response?.data?.error ?? "Erro ao remover produto";
                                  addToast({ type: "error", message });
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Remover
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={productDraft.stock}
                          onChange={(e) => setProductDraft({ ...productDraft, stock: e.target.value })}
                          placeholder="Estoque"
                          inputMode="numeric"
                          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                        />
                        <input
                          value={productDraft.discount}
                          onChange={(e) => setProductDraft({ ...productDraft, discount: e.target.value })}
                          placeholder="Desconto %"
                          inputMode="numeric"
                          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
                        />
                        <input
                          value={productDraft.images}
                          onChange={(e) => setProductDraft({ ...productDraft, images: e.target.value })}
                          placeholder="Imagens (URLs separadas por vírgula)"
                          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25 md:col-span-2"
                        />
                        <textarea
                          value={productDraft.description}
                          onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })}
                          placeholder="Descrição"
                          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25 md:col-span-2 min-h-24"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
