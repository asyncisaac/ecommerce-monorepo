"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../lib/api";
import { SearchIcon } from "./icons";

type Category = { id: string; name: string; slug: string };

export default function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);

  const [q, setQ] = useState<string>(searchParams.get("q") || "");
  const [category, setCategory] = useState<string>(searchParams.get("category") || "");
  const [sort, setSort] = useState<string>(searchParams.get("sort") || "recent");

  useEffect(() => {
    api.get("/api/categories")
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  const paramsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    if (q.trim()) obj.q = q.trim();
    if (category.trim()) obj.category = category.trim();
    if (sort) obj.sort = sort;
    return obj;
  }, [q, category, sort]);

  function applyFilters() {
    const sp = new URLSearchParams(paramsObj);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm text-black/70">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50">
            <SearchIcon />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produtos"
            className="w-full md:w-64 rounded-full border border-black/10 bg-white px-9 py-2 outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
        <select
          name="category"
          defaultValue={category || ""}
          className="form-select"
        >
          <option value="">Todas as categorias</option>
          <option value="Eletrônicos">Eletrônicos</option>
          <option value="Roupas">Roupas</option>
          <option value="Livros">Livros</option>
        </select>
        <select
          name="sort"
          defaultValue={sort || ""}
          className="form-select"
        >
          <option value="">Ordenar por</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="name_asc">Nome A-Z</option>
          <option value="name_desc">Nome Z-A</option>
        </select>
      </div>
      <div>
        <button
          onClick={applyFilters}
          className="btn-primary text-sm"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}