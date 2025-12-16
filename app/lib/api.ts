// API client for backend integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    // Handle FormData bodies by omitting Content-Type so the browser sets it correctly
    const isFormData =
      typeof FormData !== 'undefined' &&
      options.body !== undefined &&
      options.body instanceof FormData;

    const baseHeaders: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const headers: HeadersInit = {
      ...baseHeaders,
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.request('/token', {
      method: 'POST',
      body: formData,
      headers: {}, // Content-Type intentionally omitted for FormData
    });

    this.setToken(response.access_token);
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/users/me');
  }

  // Alerts
  async getAlerts(params: { skip?: number; limit?: number; severity?: string } = {}) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/alerts${query ? '?' + query : ''}`);
  }

  async createAlert(alert: {
    host: string;
    path: string;
    severity: string;
    fme: number;
    abt: number;
    type: string;
  }) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }

  // File Events
  async getFileEvents(params: { skip?: number; limit?: number } = {}) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/file-events${query ? '?' + query : ''}`);
  }

  async createFileEvent(event: {
    path: string;
    action: string;
    fme: number;
  }) {
    return this.request('/file-events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Metrics
  async getMetrics() {
    return this.request('/metrics');
  }

  // Monitoring
  async startMonitoring(paths?: string[]) {
    return this.request('/monitoring/start', {
      method: 'POST',
      body: JSON.stringify(paths ?? []),
    });
  }

  async stopMonitoring() {
    return this.request('/monitoring/stop', {
      method: 'POST',
    });
  }

  async getMonitoringStatus() {
    return this.request('/monitoring/status');
  }

  // Test endpoints
  async createTestAlert() {
    return this.request('/test/alert', {
      method: 'POST',
    });
  }

  async createTestFileEvent() {
    return this.request('/test/file-event', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
