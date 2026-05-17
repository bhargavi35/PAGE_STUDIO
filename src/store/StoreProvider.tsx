"use client";

import { useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store/store";

/**
 * Per-render store factory: ensures each request gets its own store instance
 * on the server (no cross-request state leak) while the client retains a
 * stable store across re-renders.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
