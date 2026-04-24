"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, MenuIcon } from "./icons";
import MiniCart from "./MiniCart";
import { useState } from "react";
import { useToast } from "./ToastProvider";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const router = useRouter();
  const { addToast } = useToast();
  const { loading, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const authed = Boolean(user);
  const isAdmin = user?.role === "ADMIN";

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const query = q.trim();
      router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    }
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-black/10 dark:bg-black/60 dark:border-white/10">
      <div className="container-page h-12 flex items-center justify-between">
        <Link href="/" className="font-medium tracking-tight text-black dark:text-white">
          Loja
        </Link>
        <div className="flex items-center gap-6">
          <button className="md:hidden text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" aria-label="Menu" onClick={() => setMobileOpen(v => !v)}>
            <MenuIcon />
          </button>
          <div className="hidden md:flex items-center">
            <div className="relative flex items-center rounded-full border border-black/10 bg-white px-3 py-1 dark:border-white/15 dark:bg-white/10">
              <div className="mr-2 text-black/50 dark:text-white/50">
                <SearchIcon />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Buscar"
                className="outline-none bg-transparent placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40"
              />
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/products" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white hidden md:inline">Produtos</Link>
            <Link href="/search" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white hidden md:inline">Buscar</Link>
            {!authed && !loading ? (
              <Link href="/login" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white">Entrar</Link>
            ) : null}
            {authed ? (
              <>
                <Link href="/account" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white hidden md:inline">Conta</Link>
                <Link href="/orders" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white hidden md:inline">Pedidos</Link>
                {isAdmin ? (
                  <Link href="/admin" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white hidden md:inline">Admin</Link>
                ) : null}
                <button
                  className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white"
                  onClick={async () => {
                    await logout();
                    addToast({ type: "success", message: "Você saiu da conta" });
                    window.location.href = "/";
                  }}
                >
                  Sair
                </button>
              </>
            ) : null}
            <MiniCart />
          </nav>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-black/10 bg-white dark:border-white/10 dark:bg-black/70">
          <nav className="container-page py-3 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center rounded-full border border-black/10 bg-white px-3 py-1 w-full dark:border-white/15 dark:bg-white/10">
                <div className="mr-2 text-black/50 dark:text-white/50">
                  <SearchIcon />
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { const query = q.trim(); setMobileOpen(false); router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search"); } }}
                  placeholder="Buscar"
                  className="outline-none bg-transparent placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40 w-full"
                />
              </div>
            </div>
            <Link href="/products" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Produtos</Link>
            <Link href="/search" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Buscar</Link>
            {!authed && !loading ? (
              <Link href="/login" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Entrar</Link>
            ) : null}
            {authed ? (
              <>
                <Link href="/account" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Conta</Link>
                <Link href="/orders" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Pedidos</Link>
                {isAdmin ? (
                  <Link href="/admin" className="text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" onClick={() => setMobileOpen(false)}>Admin</Link>
                ) : null}
                <button
                  className="text-left text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white"
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                    addToast({ type: "success", message: "Você saiu da conta" });
                    window.location.href = "/";
                  }}
                >
                  Sair
                </button>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
