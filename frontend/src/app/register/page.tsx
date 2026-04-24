"use client";
import { useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../components/AuthProvider";

export default function RegisterPage() {
  const { addToast } = useToast();
  const { loginWithToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/register", { name, email, password }, { headers: { "x-request-id": "frontend-register" } });
      const token = res?.data?.token as string | undefined;
      if (token) await loginWithToken(token);
      addToast({ type: "success", message: "Conta criada com sucesso" });
      window.location.href = "/";
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? "Erro ao criar conta";
      setError(msg);
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page py-16">
      <div className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-semibold mb-4">Criar conta</h1>
        <p className="text-black/60 dark:text-white/70 mb-6">Crie sua conta para comprar com mais rapidez.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              placeholder="Seu nome"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">Mínimo 8 caracteres, com letras e números.</p>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>
          <a href="/login" className="btn-secondary w-full">Já tenho conta</a>
        </form>
      </div>
    </main>
  );
}
