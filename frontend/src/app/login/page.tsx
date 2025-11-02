"use client";
import { useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";

export default function LoginPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/login", { email, password }, {
        headers: { "x-request-id": "frontend-login" },
      });
      const token = res?.data?.token as string | undefined;
      if (token) {
        localStorage.setItem("token", token);
      }
      try { await api.get("/api/auth/me"); } catch {}
      addToast({ type: "success", message: "Bem-vindo!" });
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? "Credenciais inválidas");
      addToast({ type: "error", message: "Falha no login" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-page py-16">
      <div className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-semibold mb-4">Entrar</h1>
        <p className="text-white/70 mb-6">Acesse sua conta para continuar.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-md bg-black/20 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-white/50 mt-1">Mínimo 8 caracteres, com letras e números.</p>
          </div>
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}