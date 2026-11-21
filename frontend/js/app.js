// Party Booster — Main JavaScript

const TOKEN_KEY = 'pb_token';

function setupNavigation() {
  const list = document.querySelector('.nav-links');
  if (!list) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  for (const link of list.querySelectorAll('a[href]')) {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.textContent = 'Menu';
  list.id = 'site-navigation';
  button.setAttribute('aria-controls', list.id);
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    const open = list.classList.toggle('nav-open');
    button.setAttribute('aria-expanded', String(open));
  });
  list.before(button);
  list.classList.add('nav-ready');
}

// Auth Helper
const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
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
    localStorage.removeItem(TOKEN_KEY);
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
    const signedIn = this.isAuthenticated();
    const heroAction = document.getElementById('heroAccountAction');
    if (heroAction) {
      heroAction.href = signedIn ? 'dashboard.html' : 'register.html';
      heroAction.textContent = signedIn ? 'Go to Dashboard' : 'Get Started Free';
    }
    if (signedIn) {
      if (authLinks) authLinks.style.display = 'none';
      if (userLinks) userLinks.style.display = 'block';
    } else {
      if (authLinks) authLinks.style.display = 'block';
      if (userLinks) userLinks.style.display = 'none';
    }
  },

  async api(endpoint, options = {}) {
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
      response = await fetch(`/api${endpoint}`, {
        ...options, headers, credentials: 'omit', redirect: 'error',
        signal: options.signal || AbortSignal.timeout(15000)
      });
    } catch {
      throw new Error('Party Booster is unavailable right now. Please try again.');
    }

    if (response.status >= 500 || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Party Booster is unavailable right now. Please try again.');
    }

    if (response.status === 401 && token && token === this.getToken()) {
      localStorage.removeItem(TOKEN_KEY);
      this.updateUI();
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
  setupNavigation();
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
    const page = window.location.pathname.split('/').pop();
    const destination = page + window.location.search + window.location.hash;
    window.location.href = `login.html?${new URLSearchParams({ next: destination })}`;
    return false;
  }
  return true;
}

function getSignInDestination() {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  return /^(?:dashboard|create-event)\.html(?:[?#].*)?$/.test(next) ? next : 'dashboard.html';
}

function carrySignInDestination(link) {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next) link.search = new URLSearchParams({ next: getSignInDestination() });
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
