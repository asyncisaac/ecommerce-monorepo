"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";

type Me = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export default function AccountPage() {
  const { addToast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/user/me");
      setMe(res.data);
      setName(res.data?.name ?? "");
      setEmail(res.data?.email ?? "");
      setError(null);
    } catch (err: any) {
      if (err?.response?.status === 401) setError("Faça login para acessar sua conta.");
      else setError(err?.response?.data?.error || "Erro ao carregar conta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put("/api/user/me", { name, email });
      setMe(res.data);
      addToast({ type: "success", message: "Perfil atualizado" });
    } catch (err: any) {
      addToast({ type: "error", message: err?.response?.data?.error || "Erro ao atualizar perfil" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      setChanging(true);
      await api.put("/api/user/password", { oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      addToast({ type: "success", message: "Senha alterada" });
    } catch (err: any) {
      addToast({ type: "error", message: err?.response?.data?.error || "Erro ao alterar senha" });
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <main className="container-page py-12">
        <div className="card p-6 skeleton h-28" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-page py-12">
        <div className="card p-6 text-black/70 dark:text-white/70">{error}</div>
      </main>
    );
  }

  return (
    <main className="container-page py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Minha conta</h1>
          <div className="text-sm text-black/60 dark:text-white/60">{me?.email}</div>
        </div>
        <a href="/orders" className="btn-secondary">Meus pedidos</a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Perfil</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:focus:ring-white/25"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
            </div>
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Senha</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Senha atual</label>
              <input
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                type="password"
                className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Nova senha</label>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                className="w-full rounded-md bg-white border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/25"
              />
              <p className="text-xs text-black/50 dark:text-white/50 mt-1">Mínimo 8 caracteres, com letras e números.</p>
            </div>
            <button className="btn-primary w-full" disabled={changing}>
              {changing ? "Alterando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
