// Tiny pub/sub over sessionStorage.coned_token. Surfaces read via
// useAuthToken(); mutations dispatch `coned-auth-change` so subscribers
// (ProvenanceStrip, cross-surface guards) re-render without polling.
//
// Why not lift token state to <AppShell>: every surface already hydrates
// from sessionStorage independently. This module standardizes the write
// side (setToken/clearToken) so the strip can react without refactoring
// every surface's local state.

import { useSyncExternalStore } from "react";

const EVENT = "coned-auth-change";

export function getToken() {
  try {
    return sessionStorage.getItem("coned_token") || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem("coned_token", token);
    else sessionStorage.removeItem("coned_token");
  } finally {
    window.dispatchEvent(new Event(EVENT));
  }
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useAuthToken() {
  return useSyncExternalStore(subscribe, getToken, () => null);
}
