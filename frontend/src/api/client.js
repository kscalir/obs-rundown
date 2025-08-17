// =============================================
// /src/api/client.js
// Centralized fetch with JSON, errors, AbortController
// =============================================
export function createApi(base = "") {
  const get = (url, opts = {}) => req("GET", url, null, opts);
  const post = (url, body, opts = {}) => req("POST", url, body, opts);
  const patch = (url, body, opts = {}) => req("PATCH", url, body, opts);
  const put = (url, body, opts = {}) => req("PUT", url, body, opts);
  const del = (url, opts = {}) => req("DELETE", url, null, opts);

  async function req(method, url, body, { signal } = {}) {
    const r = await fetch(`${base}${url}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`${method} ${url} failed ${r.status}: ${text}`);
    }
    const ct = r.headers.get("content-type") || "";
    return ct.includes("json") ? r.json() : r.text();
  }

  return { get, post, patch, put, del };
}