"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, MenuIcon } from "./icons";
import MiniCart from "./MiniCart";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./ToastProvider";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const router = useRouter();
  const { addToast } = useToast();
  const { loading, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const authed = Boolean(user);
  const isAdmin = user?.role === "ADMIN";
  const accountRef = useRef<HTMLDivElement>(null);

  function goSearch() {
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      goSearch();
    }
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const navLink = "rounded-full px-3 py-2 text-sm text-black/80 hover:text-black hover:bg-black/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10 transition";

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/85 border-b border-black/10 shadow-sm shadow-black/5 dark:bg-black/70 dark:border-white/10 dark:shadow-black/40">
      <div className="container-page h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white" aria-label="Menu" onClick={() => setMobileOpen(v => !v)}>
            <MenuIcon />
          </button>
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-black dark:text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">L</span>
            <span className="hidden sm:inline">Loja</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/products" className={navLink}>Produtos</Link>
            <Link href="/search" className={navLink}>Categorias</Link>
          </nav>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl">
          <div className="w-full relative flex items-center rounded-full border border-black/10 bg-white px-4 py-2 dark:border-white/15 dark:bg-white/10">
            <div className="mr-2 text-black/50 dark:text-white/50">
              <SearchIcon />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Buscar produtos"
              className="w-full outline-none bg-transparent placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40"
            />
            <button
              type="button"
              className="ml-2 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              aria-label="Buscar"
              onClick={goSearch}
            >
              <SearchIcon />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!authed && !loading ? (
            <>
              <Link href="/login" className="hidden sm:inline-flex btn-secondary">Entrar</Link>
              <Link href="/register" className="hidden sm:inline-flex btn-primary">Criar conta</Link>
            </>
          ) : null}

          {authed ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm border border-black/10 bg-white/60 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15 transition"
                aria-label="Conta"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-white text-xs font-medium dark:bg-white dark:text-black">
                  {(user?.name?.trim()?.[0] || user?.email?.trim()?.[0] || "U").toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">
                  {user?.name?.trim() || user?.email || "Conta"}
                </span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-black/10 bg-white shadow-lg p-2 dark:border-white/15 dark:bg-black/80 backdrop-blur">
                  <a href="/account" className="block rounded-lg px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
                    Minha conta
                  </a>
                  <a href="/orders" className="block rounded-lg px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
                    Pedidos
                  </a>
                  {isAdmin ? (
                    <a href="/admin" className="block rounded-lg px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
                      Admin
                    </a>
                  ) : null}
                  <div className="my-1 h-px bg-black/10 dark:bg-white/10" />
                  <button
                    type="button"
                    className="w-full text-left rounded-lg px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={async () => {
                      setAccountOpen(false);
                      await logout();
                      addToast({ type: "success", message: "Você saiu da conta" });
                      window.location.href = "/";
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <MiniCart />
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-black/10 bg-white dark:border-white/10 dark:bg-black/70">
          <div className="container-page py-4 space-y-3">
            <div className="w-full relative flex items-center rounded-full border border-black/10 bg-white px-4 py-2 dark:border-white/15 dark:bg-white/10">
              <div className="mr-2 text-black/50 dark:text-white/50">
                <SearchIcon />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setMobileOpen(false); goSearch(); } }}
                placeholder="Buscar produtos"
                className="w-full outline-none bg-transparent placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40"
              />
              <button
                type="button"
                className="ml-2 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                aria-label="Buscar"
                onClick={() => { setMobileOpen(false); goSearch(); }}
              >
                <SearchIcon />
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              <Link href="/products" className="btn-secondary" onClick={() => setMobileOpen(false)}>Produtos</Link>
              <Link href="/search" className="btn-secondary" onClick={() => setMobileOpen(false)}>Categorias</Link>
              {!authed && !loading ? (
                <>
                  <Link href="/login" className="btn-secondary" onClick={() => setMobileOpen(false)}>Entrar</Link>
                  <Link href="/register" className="btn-primary" onClick={() => setMobileOpen(false)}>Criar conta</Link>
                </>
              ) : null}
              {authed ? (
                <>
                  <Link href="/account" className="btn-secondary" onClick={() => setMobileOpen(false)}>Minha conta</Link>
                  <Link href="/orders" className="btn-secondary" onClick={() => setMobileOpen(false)}>Pedidos</Link>
                  {isAdmin ? (
                    <Link href="/admin" className="btn-secondary" onClick={() => setMobileOpen(false)}>Admin</Link>
                  ) : null}
                  <button
                    className="btn-secondary text-left"
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
        </div>
      )}
    </header>
  );
}
