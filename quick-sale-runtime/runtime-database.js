const status = document.querySelector("#runtime-status");
const workspace = document.querySelector("#runtime-workspace");
const refreshButton = document.querySelector("#runtime-refresh");
let active = true;
let pending = null;
let generation = 0;

const date = (value) => value ? new Date(value).toLocaleString() : "Not scheduled";
function table(selector, records, values) {
  const target = document.querySelector(selector);
  target.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = values.length;
    cell.textContent = "No activity observed in this server run.";
    row.append(cell); target.append(row);
    return;
  }
  for (const record of records) {
    const row = document.createElement("tr");
    for (const value of values) { const cell = document.createElement("td"); cell.textContent = String(value(record) ?? ""); row.append(cell); }
    target.append(row);
  }
}

function clear(message = "Display cleared and automatic refresh paused. Refresh to reconnect.") {
  generation++;
  active = false;
  pending?.abort(); pending = null;
  workspace.hidden = true; refreshButton.disabled = false;
  document.querySelectorAll("[data-runtime-total]").forEach((element) => { element.textContent = "0"; });
  for (const selector of ["#runtime-users", "#runtime-sellers", "#runtime-buyers"]) document.querySelector(selector).replaceChildren();
  status.textContent = message;
}

async function refresh() {
  if (!active || pending) return;
  const current = generation;
  const controller = new AbortController();
  pending = controller; refreshButton.disabled = true;
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/quick-sale/runtime", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
    const data = await response.json();
    if (current !== generation) return;
    if (!response.ok) throw new Error(data.message || "Runtime activity is unavailable.");
    if (data.scope !== "quick-sale-runtime" || data.storage !== "server-memory") throw new Error("The server did not return a Quick Sale runtime snapshot.");
    document.querySelectorAll("[data-runtime-total]").forEach((element) => { element.textContent = Number(data.totals[element.dataset.runtimeTotal] || 0).toLocaleString(); });
    table("#runtime-users", data.rows.users, [(record) => record.username, (record) => date(record.createdAt), (record) => date(record.lastSeenAt), (record) => date(record.expiresAt)]);
    table("#runtime-sellers", data.rows.sellerPosts, [(record) => record.id, (record) => record.username, (record) => [record.vehicle.year, record.vehicle.make, record.vehicle.model].filter(Boolean).join(" "), (record) => record.zip, (record) => record.status, (record) => date(record.expiresAt)]);
    table("#runtime-buyers", data.rows.buyerRequests, [(record) => record.username, (record) => record.make, (record) => record.model, (record) => record.zip, (record) => `${record.radiusMiles ?? ""} miles`, (record) => date(record.updatedAt), (record) => date(record.expiresAt)]);
    document.querySelector("#runtime-timestamp").textContent = `Server started ${date(data.startedAt)} · Snapshot ${date(data.asOf)} · Counts reset on restart`;
    document.querySelector("#runtime-limit").textContent = `Tables show the latest ${data.rowLimit} records. Runtime monitoring holds up to ${Number(data.capacity).toLocaleString()} records per collection; it observes application activity and does not load database history.`;
    workspace.hidden = false;
    status.textContent = "Connected through the private viewer service. No membership or subscription data is included.";
  } catch (error) {
    if (current === generation) clear(error.name === "AbortError" ? "The runtime request timed out. Refresh to retry." : `Refresh failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
    if (current === generation) { pending = null; refreshButton.disabled = false; }
  }
}

document.querySelector("#runtime-clear").addEventListener("click", () => clear());
refreshButton.addEventListener("click", () => { active = true; refresh(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
setInterval(() => { if (document.visibilityState === "visible" && document.querySelector("#runtime-auto").checked) refresh(); }, 20000);
refresh();
