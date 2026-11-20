// Party Booster — Main JavaScript

const SERVER_ORIGIN = 'https://party-booster.onrender.com';
const BACKEND_MODE_KEY = 'pb_backend_mode';
const LOCAL_ORIGIN_KEY = 'pb_local_origin';
const LOCAL_KEY = 'pb_local_public_key';
const pageHost = window.location.hostname;
const pageIsLocal = pageHost === 'localhost' || pageHost === '[::1]' || pageHost.endsWith('.local')
  || /^(?:127\.\d+|10\.\d+|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+$/.test(pageHost);
const savedBackendMode = localStorage.getItem(BACKEND_MODE_KEY);
const backendMode = savedBackendMode === 'local' || savedBackendMode === 'server'
  ? savedBackendMode
  : pageIsLocal ? 'local' : 'server';
const localOrigin = parseBackendOrigin(localStorage.getItem(LOCAL_ORIGIN_KEY))
  || (pageIsLocal ? window.location.origin : 'http://localhost:3000');
const localPublicKey = localStorage.getItem(LOCAL_KEY);
const backendOrigin = backendMode === 'local' ? localOrigin : SERVER_ORIGIN;
const API_URL = `${backendOrigin}/api`;
const tokenKey = backendMode === 'server' ? 'pb_token' : `pb_token:${localOrigin}:${localPublicKey}`;
let localIdentityCheck;

function parseBackendOrigin(value) {
  try {
    const url = new URL(value);
    const loopback = url.hostname === 'localhost' || url.hostname === '[::1]'
      || /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
    if ((url.protocol === 'https:' || (url.protocol === 'http:' && loopback))
        && url.origin !== SERVER_ORIGIN &&
        !url.username && !url.password && !url.search && !url.hash &&
        ['/', '/api', '/api/'].includes(url.pathname)) {
      return url.origin;
    }
  } catch {
    // An empty or malformed URL falls back to the default.
  }
  return null;
}

async function verifyLocalBackend(origin, publicKey) {
  if (!publicKey) throw new Error('Pair the Local backend with its public key before using it.');
  if (!window.crypto.subtle) throw new Error('Open the frontend over HTTPS or on localhost to verify a Local backend.');
  if (!parseBackendOrigin(origin)) throw new Error('Use HTTPS for a Local backend outside this computer.');

  try {
    const bytes = Uint8Array.from(atob(publicKey), char => char.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', bytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
      byte.toString(16).padStart(2, '0')).join('');
    const response = await fetch(`${origin}/api/backend-identity?challenge=${challenge}`, {
      credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Identity route failed');
    const { signature } = await response.json();
    const proof = Uint8Array.from(atob(signature), char => char.charCodeAt(0));
    const message = new TextEncoder().encode(`party-booster-v1\n${origin}\n${challenge}`);
    if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, proof, message)) {
      throw new Error('Invalid proof');
    }
  } catch {
    throw new Error('Local backend identity could not be verified. Check its URL and public key.');
  }
}

function ensureLocalIdentity() {
  localIdentityCheck ??= verifyLocalBackend(localOrigin, localPublicKey).finally(() => {
    localIdentityCheck = undefined;
  });
  return localIdentityCheck;
}

function showBackendStatus(message) {
  const status = document.getElementById('backend-status');
  if (status) status.textContent = message;
}

async function checkServerHealth() {
  try {
    const response = await fetch(`${SERVER_ORIGIN}/api/health`, {
      credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok || (await response.json()).status !== 'ok') throw new Error('Health check failed');
    showBackendStatus('');
  } catch {
    showBackendStatus('Server unavailable. Retry Server or select a verified Local backend.');
  }
}

function addBackendSwitcher() {
  const navbar = document.querySelector('.navbar .container');
  if (!navbar) return;

  const switcher = document.createElement('div');
  switcher.className = 'backend-switcher';
  switcher.innerHTML = `
    <div class="backend-options">
      <button type="button" class="btn btn-outline" data-server>Server</button>
      <details>
        <summary>Local</summary>
        <form class="backend-switcher-form">
          <div class="backend-field">
            <label for="local-backend-url">Local backend URL</label>
            <input id="local-backend-url" name="localUrl" type="url" placeholder="http://localhost:3000" spellcheck="false" required>
          </div>
          <div class="backend-field">
            <label for="local-backend-key">Backend public key</label>
            <input id="local-backend-key" name="publicKey" type="text" spellcheck="false" autocomplete="off" required>
          </div>
          <button type="submit" class="btn btn-primary">Verify and use Local</button>
          <p role="status" data-local-status></p>
        </form>
      </details>
    </div>
    <p id="backend-status" role="status"></p>
  `;
  const server = switcher.querySelector('[data-server]');
  server.setAttribute('aria-pressed', String(backendMode === 'server'));
  server.title = SERVER_ORIGIN;
  const local = switcher.querySelector('summary');
  local.textContent = backendMode === 'local' ? 'Local (active)' : 'Local';
  local.title = localOrigin;

  const form = switcher.querySelector('form');
  const url = form.elements.localUrl;
  url.value = localOrigin;
  form.elements.publicKey.value = localPublicKey || '';
  url.addEventListener('input', () => url.setCustomValidity(''));

  server.addEventListener('click', () => {
    if (backendMode === 'server') {
      checkServerHealth();
      return;
    }
    localStorage.setItem(BACKEND_MODE_KEY, 'server');
    window.location.assign('index.html');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const origin = parseBackendOrigin(url.value);
    if (!origin) {
      url.setCustomValidity('Enter an HTTPS backend URL or an HTTP loopback URL, such as http://localhost:3000.');
      url.reportValidity();
      return;
    }
    const key = form.elements.publicKey.value.replace(/\s/g, '');
    const button = form.querySelector('[type=submit]');
    const status = form.querySelector('[data-local-status]');
    button.disabled = true;
    status.textContent = 'Verifying backend identity…';
    try {
      await verifyLocalBackend(origin, key);
      localStorage.setItem(LOCAL_ORIGIN_KEY, origin);
      localStorage.setItem(LOCAL_KEY, key);
      localStorage.setItem(BACKEND_MODE_KEY, 'local');
      window.location.assign('index.html');
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  navbar.append(switcher);
  if (backendMode === 'server') checkServerHealth();
  if (backendMode === 'local' && !localPublicKey) showBackendStatus('Pair the Local backend or use Server.');
}

// Auth Helper
const Auth = {
  getToken() {
    return localStorage.getItem(tokenKey);
  },

  setToken(token) {
    localStorage.setItem(tokenKey, token);
    this.updateUI();
  },

  getUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(tokenKey);
    this.updateUI();
    window.location.href = 'index.html';
  },

  isAuthenticated() {
    const user = this.getUser();
    return Number.isFinite(user?.exp) && user.exp > Date.now() / 1000;
  },

  updateUI() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    if (this.isAuthenticated()) {
      if (authLinks) authLinks.style.display = 'none';
      if (userLinks) userLinks.style.display = 'block';
    } else {
      if (authLinks) authLinks.style.display = 'block';
      if (userLinks) userLinks.style.display = 'none';
    }
  },

  async api(endpoint, options = {}) {
    if (backendMode === 'local') await ensureLocalIdentity();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.isAuthenticated() ? this.getToken() : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options, headers, credentials: 'omit', redirect: 'error',
        signal: options.signal || AbortSignal.timeout(15000)
      });
    } catch {
      if (backendMode === 'server') showBackendStatus('Server unavailable. Retry Server or select a verified Local backend.');
      throw new Error(`Could not reach the ${backendMode} backend at ${backendOrigin}.`);
    }

    if (backendMode === 'server' && response.status >= 500) {
      showBackendStatus('Server unavailable. Retry Server or select a verified Local backend.');
    }

    if (response.status === 401 && token && token === this.getToken()) {
      localStorage.removeItem(tokenKey);
      this.updateUI();
    }

    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`The ${backendMode} backend at ${backendOrigin} returned an unexpected response (HTTP ${response.status}).`);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  addBackendSwitcher();
  Auth.updateUI();

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
});

// Require authentication for protected pages
function requireAuth() {
  if (!Auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format number with commas
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Show error message
function showError(message, container = null) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.textContent = message;
  if (container) {
    container.insertBefore(errorDiv, container.firstChild);
  }
  setTimeout(() => errorDiv.remove(), 5000);
}

// Show success message
function showSuccess(message, container = null) {
  const successDiv = document.createElement('div');
  successDiv.className = 'form-success';
  successDiv.textContent = message;
  if (container) {
    container.insertBefore(successDiv, container.firstChild);
  }
  setTimeout(() => successDiv.remove(), 5000);
}
