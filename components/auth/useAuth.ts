"use client";

import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

export type AuthState = {
  /** "disabled" = Supabase not configured (local-only mode). */
  status: "disabled" | "loading" | "signed-out" | "signed-in";
  user: User | null;
};

export const useAuth = create<AuthState>()(() => ({ status: "loading", user: null }));
