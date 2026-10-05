"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { AiUsage } from "@/lib/schema/ai-requests";
import { fetchAiUsage } from "./client";

const useStore = create<{ usage: AiUsage | null; loaded: boolean }>()(() => ({
  usage: null,
  loaded: false,
}));

/** Re-reads models and today's budget (after every AI call). */
export async function refreshAiUsage(): Promise<void> {
  useStore.setState({ usage: await fetchAiUsage(), loaded: true });
}

/** `undefined` while loading; `null` if the server couldn't say. */
export function useAiUsage(): AiUsage | null | undefined {
  const { usage, loaded } = useStore();
  useEffect(() => {
    if (!useStore.getState().loaded) void refreshAiUsage();
  }, []);
  return loaded ? usage : undefined;
}
