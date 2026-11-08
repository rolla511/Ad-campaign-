const RUNTIME_BACKEND_URL = "https://awroadside-fire-structure.onrender.com";
const runtimeServer = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) ? "http://127.0.0.1:3000" : RUNTIME_BACKEND_URL;
const runtimeEndpoint = `${runtimeServer}/api/quick-sale/runtime/status`;
document.querySelector("#runtime-service-link").href = runtimeEndpoint;
const status = document.querySelector("#runtime-status");
const connection = document.querySelector("#runtime-connection");
const workspace = document.querySelector("#runtime-workspace");
const form = document.querySelector("#runtime-query");
const refreshButton = document.querySelector("#runtime-refresh");
let active = true;
let pending = null;
let generation = 0;
let snapshot = null;
let receivedAt = 0;
let query = { collection: "users", offset: 0, limit: 100, live: "false" };
let countdowns = [];

const date = (value) => value ? new Date(value).toLocaleString() : "—";
const vehicle = (record) => [record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(" ");
const columns = {
  users: { title: "Quick Users", date: "user creation", fields: [["User reference", "username"], ["Status ID", "id"], ["Created at", "createdAt", "date"], ["Last observed", "lastSeenAt", "date"], ["Buyer leads observed", "buyerLeads"], ["Seller leads observed", "sellerLeads"], ["Buyer deadline", "buyerExpiresAt", "date"], ["Seller deadline", "sellerExpiresAt", "date"], ["Status clears at", "expiresAt", "date"], ["Time left", "expiresAt", "countdown"]] },
  sellerPosts: { title: "Seller requests", date: "vehicle posting", fields: [["Listing ID", "id"], ["Seller", "username"], ["Vehicle", "vehicle", vehicle], ["ZIP", "zip"], ["Status", "status"], ["Posted at", "createdAt", "date"], ["Erases at", "expiresAt", "date"], ["Time left", "expiresAt", "countdown"]] },
  buyerRequests: { title: "Buyer requests", date: "request update", fields: [["Request ID", "id"], ["Buyer", "username"], ["Make", "make"], ["Model", "model"], ["ZIP", "zip"], ["Radius (miles)", "radiusMiles"], ["Saved / updated", "updatedAt", "date"], ["Erases at", "expiresAt", "date"], ["Time left", "expiresAt", "countdown"]] },
  matches: { title: "Matches made", date: "match delivery", fields: [["Match ID", "id"], ["Listing ID", "listingId"], ["Seller", "sellerUsername"], ["Buyer", "buyerUsername"], ["Status", "status"], ["Delivered at", "notifiedAt", "date"], ["Respond by", "deadline", "date"], ["Response left", "deadline", "countdown"], ["Erases at", "expiresAt", "date"], ["Time left", "expiresAt", "countdown"]] }
};

function state(kind, message) {
  status.textContent = message; status.dataset.state = kind;
  connection.textContent = { connected: "Connected · Live snapshot", error: snapshot ? "Connection lost · Last snapshot" : "Not connected", paused: "Paused", loading: "Loading runtime…" }[kind];
  connection.dataset.state = kind;
  document.querySelector("#runtime-help").open = kind === "error";
}

function serverTime() { return snapshot ? Date.parse(snapshot.asOf) + Date.now() - receivedAt : Date.now(); }

function remaining(value) {
  if (!value) return "No fixed deadline";
  let seconds = Math.max(0, Math.ceil((Date.parse(value) - serverTime()) / 1000));
  if (!seconds) return "Expired";
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
}

function renderSaveCache() {
  const cache = snapshot?.saveCache;
  document.querySelector("#runtime-save-cache").textContent = cache ? `Successful PostgreSQL save receipts in the last ${cache.windowHours} hours: ${cache.records} · Last recorded save: ${date(cache.lastSavedAt)} · Reading status does not renew these receipts or the 72-hour user window.` : "Recent PostgreSQL save receipts: —. The 4-hour receipt cache is separate from the user/request retention window.";
}

function render() {
  renderSaveCache();
  const selected = columns[query.collection];
  const records = snapshot?.rows[query.collection] || [];
  const heading = document.querySelector("#runtime-columns");
  const body = document.querySelector("#runtime-records");
  heading.replaceChildren(); body.replaceChildren(); countdowns = [];
  for (const [label] of selected.fields) { const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label; heading.append(cell); }
  document.querySelector("#runtime-collection-title").textContent = selected.title;
  document.querySelector("#runtime-caption").textContent = `${selected.title} · Current runtime records`;
  document.querySelector("#runtime-date-hint").textContent = `Date filters use ${selected.date} time. Enter dates in your local timezone. Live means unexpired requests, not users currently online.`;
  document.querySelector("#runtime-selected-schema").textContent = (snapshot?.schema?.[query.collection] || [...new Set(selected.fields.map(([, key]) => key))]).join(", ");
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td"); cell.colSpan = selected.fields.length;
    cell.textContent = snapshot ? "No current runtime records match these filters. Try another table, username or date range." : "Live data is not connected. Use Load / search or Refresh now; connection details appear above.";
    row.append(cell); body.append(row);
  }
  for (const record of records) {
    const row = document.createElement("tr");
    for (const [, key, format] of selected.fields) {
      const cell = document.createElement("td");
      cell.textContent = String(typeof format === "function" ? format(record) : format === "date" ? date(record[key]) : format === "countdown" ? remaining(record[key]) : record[key] ?? "—");
      if (format === "countdown") { cell.dataset.countdown = key; countdowns.push({ cell, expiresAt: record[key] }); }
      row.append(cell);
    }
    body.append(row);
  }
  const result = snapshot?.result;
  document.querySelector("#runtime-result").textContent = result ? `${result.total.toLocaleString()} matching records · Showing ${records.length ? result.offset + 1 : 0}–${result.offset + records.length} · Global counters are not filtered` : "No data loaded. Choose a table and use Load / search.";
  document.querySelector("#runtime-previous").disabled = !result || result.offset === 0;
  document.querySelector("#runtime-next").disabled = !result?.hasMore;
}

function reset(message) {
  generation++; active = false;
  pending?.abort(); pending = null;
  snapshot = null; countdowns = [];
  refreshButton.disabled = false;
  workspace.setAttribute("aria-busy", "false");
  document.querySelectorAll("[data-runtime-total]").forEach((element) => { element.textContent = "—"; });
  document.querySelector("#runtime-timestamp").textContent = "No verified server snapshot. Dashes mean unavailable, not zero users.";
  render(); state("paused", message);
}

async function refresh() {
  if (!active || pending) return;
  const current = generation;
  const controller = new AbortController();
  pending = controller; refreshButton.disabled = true;
  workspace.setAttribute("aria-busy", "true");
  state("loading", `Requesting live runtime status from ${runtimeServer}…`);
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${runtimeEndpoint}?${new URLSearchParams(query)}`, { cache: "no-store", credentials: "omit", signal: controller.signal });
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`HTTP ${response.status}: ${runtimeEndpoint} did not return runtime JSON. Check that the status API is deployed on the configured backend.`); }
    if (current !== generation) return;
    if (response.status === 404) throw new Error(`HTTP 404: ${runtimeEndpoint} is not deployed. Update the Quick Sale backend; this frontend does not need a gateway or token.`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.message || "Runtime data is unavailable."}`);
    if (data.scope !== "quick-sale-runtime" || data.storage !== "server-memory") throw new Error("This URL is not connected to the Quick Sale runtime API.");
    if (data.visibility !== "anonymous-status") throw new Error("The backend did not return the anonymous runtime status view.");
    if (data.version !== 2 || data.result?.collection !== query.collection || !Array.isArray(data.rows?.[query.collection]) || !Number.isFinite(Date.parse(data.asOf))) throw new Error("The backend needs the searchable runtime dashboard update. Deploy the updated runtime monitor and API before retrying.");
    snapshot = data; receivedAt = Date.now();
    document.querySelectorAll("[data-runtime-total]").forEach((element) => { element.textContent = Number(data.totals[element.dataset.runtimeTotal] || 0).toLocaleString(); });
    document.querySelector("#runtime-timestamp").textContent = `Backend started ${date(data.startedAt)} · Verified snapshot ${date(data.asOf)} · Counts reset on backend restart`;
    document.querySelector("#runtime-limit").textContent = `Up to ${data.rowLimit} rows per page. Search covers up to ${Number(data.capacity).toLocaleString()} observed records per runtime collection; no database query is made.`;
    render();
    state("connected", "Live runtime status loaded directly from the Quick Sale backend. User references are anonymous; you can check a known username, ZIP, vehicle or status ID.");
  } catch (error) {
    if (current === generation) {
      active = false;
      state("error", `${error.name === "AbortError" ? "The runtime service timed out. Refresh to retry." : error.message}${snapshot ? ` Showing the last verified snapshot from ${date(snapshot.asOf)}; it is not a new live response.` : " No live records have been loaded."}`);
      render();
    }
  } finally {
    clearTimeout(timeout);
    if (current === generation) { pending = null; refreshButton.disabled = false; workspace.setAttribute("aria-busy", "false"); }
  }
}

function search() {
  reset("Preparing runtime search…");
  try {
    const values = form.elements;
    const from = values.from.value ? new Date(values.from.value).toISOString() : "";
    const to = values.to.value ? new Date(values.to.value).toISOString() : "";
    if (from && to && from > to) throw new Error("The From date/time must be before the Through date/time.");
    query = { collection: values.collection.value, q: values.q.value.trim(), from, to, live: String(values.live.checked), offset: 0, limit: 100 };
    render(); active = true; refresh();
  } catch (error) { state("error", `Check your search dates: ${error.message}`); }
}

form.addEventListener("submit", (event) => { event.preventDefault(); search(); });
form.elements.collection.addEventListener("change", search);
document.querySelector("#runtime-reset").addEventListener("click", () => { form.reset(); search(); });
document.querySelector("#runtime-clear").addEventListener("click", () => reset("Display cleared and automatic requests paused. Refresh or search to reconnect."));
refreshButton.addEventListener("click", () => { active = true; refresh(); });
for (const [selector, direction] of [["#runtime-previous", -1], ["#runtime-next", 1]]) document.querySelector(selector).addEventListener("click", () => {
  const offset = Math.max(0, query.offset + direction * query.limit);
  reset("Loading another page…"); query.offset = offset; active = true; refresh();
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
setInterval(() => { if (document.visibilityState === "visible" && document.querySelector("#runtime-auto").checked && !form.contains(document.activeElement)) refresh(); }, 20000);
setInterval(() => {
  document.querySelector("#runtime-clock").textContent = `Your current time: ${new Date().toLocaleString()}`;
  if (snapshot) {
    const records = snapshot.rows[query.collection];
    const current = records.filter((record) => !record.expiresAt || Date.parse(record.expiresAt) > serverTime());
    for (const record of current) if (record.saveReceiptExpiresAt && Date.parse(record.saveReceiptExpiresAt) <= serverTime()) { record.lastSavedAt = null; record.saveReceiptExpiresAt = null; }
    if (snapshot.saveCache?.expiresAt && Date.parse(snapshot.saveCache.expiresAt) <= serverTime()) { snapshot.saveCache = { ...snapshot.saveCache, records: 0, lastSavedAt: null, expiresAt: null }; renderSaveCache(); }
    if (current.length !== records.length) { snapshot.rows[query.collection] = current; render(); }
  }
  for (const { cell, expiresAt } of countdowns) cell.textContent = remaining(expiresAt);
}, 1000);
render(); refresh();
