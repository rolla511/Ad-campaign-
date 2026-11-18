// Party Booster — Main JavaScript

// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

// Auth Helper
const Auth = {
  getToken() {
    return localStorage.getItem('pb_token');
  },

  setToken(token) {
    localStorage.setItem('pb_token', token);
    this.updateUI();
  },

  getUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('pb_token');
    this.updateUI();
    window.location.href = 'index.html';
  },

  isAuthenticated() {
    return !!this.getToken();
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
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
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
