"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, MenuIcon } from "./icons";
import MiniCart from "./MiniCart";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const query = q.trim();
      router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    }
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-black/10">
      <div className="container-page h-12 flex items-center justify-between">
        <Link href="/" className="font-medium tracking-tight text-black">
          Sublime
        </Link>
        <div className="flex items-center gap-6">
          <button className="md:hidden text-black/80 hover:text-black" aria-label="Menu" onClick={() => setMobileOpen(v => !v)}>
            <MenuIcon />
          </button>
          <div className="hidden md:flex items-center">
            <div className="relative flex items-center rounded-full border border-black/10 bg-white px-3 py-1">
              <div className="mr-2 text-black/50">
                <SearchIcon />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Buscar"
                className="outline-none bg-transparent placeholder:text-black/40"
              />
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/products" className="text-black/80 hover:text-black hidden md:inline">Produtos</Link>
            <Link href="/search" className="text-black/80 hover:text-black hidden md:inline">Buscar</Link>
            <Link href="/login" className="text-black/80 hover:text-black">Entrar</Link>
            <MiniCart />
          </nav>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-black/10 bg-white">
          <nav className="container-page py-3 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center rounded-full border border-black/10 bg-white px-3 py-1 w-full">
                <div className="mr-2 text-black/50">
                  <SearchIcon />
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { const query = q.trim(); setMobileOpen(false); router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search"); } }}
                  placeholder="Buscar"
                  className="outline-none bg-transparent placeholder:text-black/40 w-full"
                />
              </div>
            </div>
            <Link href="/products" className="text-black/80 hover:text-black" onClick={() => setMobileOpen(false)}>Produtos</Link>
            <Link href="/search" className="text-black/80 hover:text-black" onClick={() => setMobileOpen(false)}>Buscar</Link>
            <Link href="/login" className="text-black/80 hover:text-black" onClick={() => setMobileOpen(false)}>Entrar</Link>
          </nav>
        </div>
      )}
    </header>
  );
}