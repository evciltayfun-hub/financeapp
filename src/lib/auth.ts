export const AUTH_COOKIE = "fa_auth";

// Web Crypto so it works in both the proxy (edge) and route handlers.
export async function authToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`financeapp:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
