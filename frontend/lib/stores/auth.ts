"use client";

import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    full_name?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  init: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, initialized: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, initialized: true });
        return;
      }
      set({ initialized: true });
    }
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post<{ user: User }>("/auth/login", {
        email,
        password,
      });
      set({ user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  register: async (email, password, full_name) => {
    set({ loading: true });
    try {
      const res = await api.post<{ user: User }>("/auth/register", {
        email,
        password,
        full_name,
      });
      set({ user: res.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    set({ user: null });
  },
  updateUser: async (patch) => {
    const res = await api.patch<User>("/auth/me", patch);
    set({ user: res });
  },
  refresh: async () => {
    const user = await api.get<User>("/auth/me");
    set({ user });
  },
}));
