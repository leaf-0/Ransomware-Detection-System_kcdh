// API client for backend integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    console.log(`[API] Request to ${url} with options`);

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }
      
      console.log(`[API] Response from ${endpoint} successful`);
      return response.json();
    } catch (error: any) {
      // Handle different types of errors
      if (error.name === 'AbortError') {
        console.error(`[API] Request to ${endpoint} timed out`);
        throw new Error('Request timed out. Please try again.');
      } else if (error.message.includes('ECONNRESET') || error.message.includes('Network error')) {
        console.error(`[API] Network error for ${endpoint}:`, error);
        throw new Error('Network error. Please check your connection.');
      } else {
        console.error(`[API] Error for ${endpoint}:`, error);
        throw error;
      }
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.request('/token', {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
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
      body: JSON.stringify(paths),
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
