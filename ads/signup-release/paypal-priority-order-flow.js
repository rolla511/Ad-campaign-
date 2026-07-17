(function () {
  const FLOW_STEPS = Object.freeze([
    "create-get",
    "get",
    "patch",
    "authorize",
    "capture-authorization"
  ]);

  function normalizeBaseUrl(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function resolveApiBaseUrl() {
    const config = window.AWRoadsideConfig || {};
    return normalizeBaseUrl(config.apiBaseUrl || "https://awroadside-fire-backend.onrender.com/api/aw-roadside");
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.sessionToken ? { Authorization: `Bearer ${options.sessionToken}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function createOrder(payload, options = {}) {
    return requestJson("/payments/create-order", {
      method: "POST",
      body: {
        paymentKind: "priority",
        intent: "AUTHORIZE",
        ...payload
      },
      sessionToken: options.sessionToken
    });
  }

  function getOrder(orderId, options = {}) {
    return requestJson(`/payments/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      sessionToken: options.sessionToken
    });
  }

  function patchOrder(orderId, patches, options = {}) {
    return requestJson(`/payments/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: patches,
      sessionToken: options.sessionToken
    });
  }

  function authorizeOrder(orderId, requestId, options = {}) {
    return requestJson("/payments/authorize-order", {
      method: "POST",
      body: {
        orderId,
        requestId: requestId || null,
        paymentKind: "priority"
      },
      sessionToken: options.sessionToken
    });
  }

  function captureAuthorization(authorizationId, options = {}) {
    return requestJson(`/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
      method: "POST",
      body: {
        final_capture: true
      },
      sessionToken: options.sessionToken
    });
  }

  window.AWRoadsidePaypalPriorityOrderFlow = Object.freeze({
    steps: FLOW_STEPS,
    createOrder,
    getOrder,
    patchOrder,
    authorizeOrder,
    captureAuthorization
  });

  window.dispatchEvent(new CustomEvent("awroadside:paypal-priority-order-flow-ready"));
})();
