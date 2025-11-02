"use client";
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001",
  withCredentials: true,
});

export function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Interceptor para anexar automaticamente o token Bearer, se existir
api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      } as any;
    }
  } catch {}
  return config;
});

// Interceptor de resposta: se 401 e existir refresh cookie, tentar refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;
    if (status === 401 && !original?._retry) {
      original._retry = true;
      try {
        const refreshRes = await api.post("/api/auth/refresh", {});
        const newToken = refreshRes?.data?.token as string | undefined;
        if (newToken) {
          localStorage.setItem("token", newToken);
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };
          return api.request(original);
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);