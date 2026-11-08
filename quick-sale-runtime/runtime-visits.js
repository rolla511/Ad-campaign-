export async function recordQuickSaleVisit(apiBase, { request = globalThis.fetch, id } = {}) {
  try {
    const visitId = id || globalThis.crypto?.randomUUID?.();
    if (!visitId) return false;
    const response = await request(`${apiBase}/api/quick-sale/runtime/visits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: visitId }), keepalive: true, credentials: "omit" });
    return response.ok;
  } catch { return false; }
}
