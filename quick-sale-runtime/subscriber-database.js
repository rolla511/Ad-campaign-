const SUBSCRIBER_BACKEND_URL = "https://awroadside-fire-structure.onrender.com";
const endpoint = `${SUBSCRIBER_BACKEND_URL}/api/quick-sale/admin/subscribers`;
const auth = document.querySelector("#subscriber-auth");
const form = document.querySelector("#subscriber-query");
const records = document.querySelector("#subscriber-records");
const status = document.querySelector("#subscriber-status");
const previous = document.querySelector("#subscriber-previous");
const next = document.querySelector("#subscriber-next");
let access = null;
let pending = null;
let generation = 0;
let selected = { q: "", mode: "all", offset: 0, limit: 100 };

const value = (content) => content === null || content === undefined || content === "" ? "Not recorded" : String(content);
const date = (content) => Number.isFinite(Date.parse(content)) ? new Date(content).toLocaleString() : "Not recorded";
const mode = (content) => content === "live" ? "LIVE" : content === "sandbox" ? "SANDBOX TEST · No real money" : "UNKNOWN · Review required";

function message(state, content) { status.dataset.state = state; status.textContent = content; }

function clearRows(content) {
  records.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 24; cell.textContent = content; row.append(cell); records.append(row);
  previous.disabled = true; next.disabled = true;
  document.querySelectorAll("[data-subscriber-total]").forEach((element) => { element.textContent = "—"; });
  document.querySelector("#subscriber-snapshot").textContent = "No database records loaded.";
  document.querySelector("#subscriber-result").textContent = "No verified result.";
}

function reset() {
  generation++;
  pending?.abort(); pending = null;
  clearRows("No subscriber records loaded. Connect with owner access to search PostgreSQL.");
}

function revokeOwnerSession(session) {
  if (session?.token) fetch(`${SUBSCRIBER_BACKEND_URL}/api/buyer/logout`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", keepalive: true }).catch(() => {});
}

function forget() {
  const previous = access;
  access = null; auth.reset(); reset();
  message("disconnected", "Owner access and displayed records cleared. No database data was erased.");
  revokeOwnerSession(previous);
}

function render(data) {
  records.replaceChildren();
  for (const entry of data.rows) {
    const evidence = entry.paymentMode === "sandbox" ? "Sandbox test · Not a Live payment" : entry.paymentStatus === "revoked" ? "Payment revoked" : entry.paymentMode === "live" && entry.livePaymentVerified === true ? "Live payment verified" : "Not verified · Review required";
    const cells = [entry.username, entry.userId, entry.name, mode(entry.paymentMode), entry.subscriptionId, entry.subscriptionStatus, evidence,
      entry.priorityServiceActive === true ? entry.paymentMode === "sandbox" ? "Sandbox test access" : "Paid term active; request/rating rules still apply" : "Inactive / unverified",
      entry.lastPaymentAmount ? `${value(entry.lastPaymentCurrency)} ${value(entry.lastPaymentAmount)}` : null,
      date(entry.lastPaymentAt), date(entry.verifiedAt), date(entry.paidThrough), entry.transactionId,
      entry.paymentMode === "live" && entry.completedLivePaymentRecorded === true ? "Completed Live payment recorded" : "Not confirmed",
      entry.paymentMode === "live" && entry.merchantReceiptVerified === true ? "Verified payee matches platform merchant" : "Not independently confirmed",
      entry.merchantId, entry.payerId, entry.planId, entry.sellerRequests, entry.buyerRequests, entry.sellerLeads, entry.buyerLeads, entry.profileKind, date(entry.profileExpiresAt)];
    const row = document.createElement("tr");
    for (const content of cells) { const cell = document.createElement("td"); cell.textContent = value(content); row.append(cell); }
    records.append(row);
  }
  if (!data.rows.length) clearRows("No stored subscribers match this search. This is not a count of runtime Quick Users.");
  document.querySelectorAll("[data-subscriber-total]").forEach((element) => { element.textContent = Number(data.totals[element.dataset.subscriberTotal]).toLocaleString(); });
  document.querySelector("#subscriber-snapshot").textContent = `PostgreSQL snapshot ${date(data.asOf)} · Current backend ${mode(data.backendPaymentMode)} · Per-record environment is shown separately`;
  document.querySelector("#subscriber-result").textContent = `${Number(data.result.total).toLocaleString()} matching accounts · ${data.rows.length ? data.result.offset + 1 : 0}–${data.rows.length ? data.result.offset + data.rows.length : 0} shown`;
  previous.disabled = data.result.offset === 0; next.disabled = !data.result.hasMore;
}

async function load() {
  if (!access || !(Date.parse(access.expiresAt) > Date.now())) { access = null; reset(); message("error", "Sign in with your platform owner username and password first. Subscriber login is not database-admin authorization."); return; }
  reset();
  const current = generation;
  const controller = new AbortController(); pending = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  message("loading", "Reading subscriber/payment records from Render's PostgreSQL connection…");
  try {
    const configuration = await fetch(`${SUBSCRIBER_BACKEND_URL}/api/quick-sale/config`, { cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal });
    const capabilities = await configuration.json();
    if (current !== generation) return;
    if (!configuration.ok || capabilities.subscriberReportVersion !== 1) throw new Error("The subscriber-report API is not deployed on Render yet. Deploy the backend report module and server changes together.");
    const response = await fetch(`${endpoint}?${new URLSearchParams(selected)}`, {
      headers: { Authorization: `Bearer ${access.token}` },
      cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal
    });
    if (response.status === 404) throw new Error("The subscriber-report API is not deployed on Render yet. Deploy the backend report module and server changes together.");
    const data = await response.json();
    if (current !== generation) return;
    if (response.status === 401 || response.status === 403) { access = null; throw new Error("Owner authorization was rejected or expired. Sign in again with the platform primary-buyer username and password."); }
    if (!response.ok) throw new Error(data.message || `Subscriber database request failed: HTTP ${response.status}`);
    if (data.scope !== "quick-sale-subscribers" || data.storage !== "postgresql" || data.readOnly !== true || !Array.isArray(data.rows) || !data.result || !data.totals || !Number.isFinite(Date.parse(data.asOf))) throw new Error("The backend did not return an authenticated PostgreSQL subscriber report.");
    render(data);
    message("connected", "Stored subscriber records loaded. Sandbox tests, verified Live payments and intended-merchant receipt evidence are distinct.");
  } catch (error) {
    if (current === generation) { clearRows("No current database records loaded. A failed request does not mean there are zero subscribers."); message("error", error.name === "AbortError" ? "Subscriber database request timed out. Retry when the backend is available." : error.message); }
  } finally { clearTimeout(timeout); if (current === generation) pending = null; }
}

auth.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = auth.elements.username.value.trim();
  const password = auth.elements.password.value;
  if (!username || !password) { message("error", "Enter your platform owner username and password. No manually created access token is needed."); return; }
  forget();
  const current = generation;
  const controller = new AbortController(); pending = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  message("loading", "Checking the backend and signing in as the platform owner…");
  try {
    const configuration = await fetch(`${SUBSCRIBER_BACKEND_URL}/api/quick-sale/config`, { cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal });
    const capabilities = await configuration.json();
    if (current !== generation) return;
    if (!configuration.ok || capabilities.subscriberReportVersion !== 1) throw new Error("The subscriber-report API is not deployed on Render yet. Deploy the backend report module and server changes together.");
    const response = await fetch(`${SUBSCRIBER_BACKEND_URL}/api/buyer/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
      cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal
    });
    const data = await response.json();
    if (current !== generation) { if (response.ok) revokeOwnerSession(data.session); return; }
    if (!response.ok) throw new Error(response.status === 503 ? "Owner sign-in is not configured or available on the backend. Use an existing primary-buyer account, or configure JUNKCAR_BUYER_USERNAME and JUNKCAR_BUYER_PASSWORD on Render." : "Owner sign-in failed. Use your platform primary-buyer credentials, not a Quick Sale subscriber login.");
    if (!data.session?.token || data.session.account?.role !== "primary" || !(Date.parse(data.session.expiresAt) > Date.now())) { revokeOwnerSession(data.session); throw new Error("This account is not an authorized platform owner. Only the primary buyer can read subscriber payment records."); }
    access = { token: data.session.token, expiresAt: data.session.expiresAt };
    selected.offset = 0;
    clearTimeout(timeout);
    pending = null;
    await load();
  } catch (error) {
    if (current === generation) { access = null; clearRows("No current database records loaded. A failed sign-in does not mean there are zero subscribers."); message("error", error.name === "AbortError" ? "Owner sign-in timed out. Retry when the backend is available." : error.message); }
  } finally { clearTimeout(timeout); if (current === generation) pending = null; }
});
form.addEventListener("submit", (event) => { event.preventDefault(); selected = { q: form.elements.q.value.trim(), mode: form.elements.mode.value, offset: 0, limit: 100 }; load(); });
document.querySelector("#subscriber-refresh").addEventListener("click", load);
document.querySelector("#subscriber-forget").addEventListener("click", forget);
previous.addEventListener("click", () => { selected.offset = Math.max(0, selected.offset - selected.limit); load(); });
next.addEventListener("click", () => { selected.offset += selected.limit; load(); });
window.addEventListener("pagehide", forget);
