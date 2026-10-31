const KEY = 'onyx:cart-id';

export function getCartId(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/** Identificador do carrinho de visitante; criado na primeira necessidade e mantido após refresh. */
export function ensureCartId(): string {
  const existing = getCartId();
  if (existing) return existing;
  const id = globalThis.crypto.randomUUID();
  try { localStorage.setItem(KEY, id); } catch { /* sem storage: vale só nesta carga */ }
  return id;
}

export function clearCartId(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}
