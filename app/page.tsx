'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AuthPanel } from '@/components/AuthPanel';

type AlertRow = {
  id: string;
  time: string;
  host: string;
  path: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  fme: number;
  abt: number;
  type: 'Ransomware' | 'RaaS' | 'Suspicious' | 'Benign';
};

type MetricCardProps = {
  title: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  accent?: 'blue' | 'cyan' | 'red' | 'green' | 'yellow';
};

const severityColor: Record<AlertRow['severity'], string> = {
  info: '#9aa3b2',
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#fb7185',
  critical: '#ef4444',
};

function MetricCard({ title, value, delta, accent = 'blue' }: MetricCardProps) {
  const gradient = {
    blue: 'from-[#60a5fa] to-[#93c5fd]',
    cyan: 'from-[#22d3ee] to-[#67e8f9]',
    red: 'from-[#fb7185] to-[#fca5a5]',
    green: 'from-[#22c55e] to-[#86efac]',
    yellow: 'from-[#f59e0b] to-[#fde047]',
  }[accent];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#9aa3b2]">{title}</span>
        <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${gradient}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {delta && (
        <div
          className={`mt-1 text-xs ${
            delta.positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}
        >
          {delta.value} {delta.positive ? '↑' : '↓'}
        </div>
      )}
    </div>
  );
}

function AlertsTable({ rows, onExport, filterControl }: { rows: AlertRow[]; onExport: () => void; filterControl: React.ReactNode }) {
  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-[#9aa3b2]">Event stream</div>
          <div className="text-lg font-semibold">Alerts</div>
        </div>
        <div className="flex items-center gap-2">
          {filterControl}
          <button className="btn btn-secondary" onClick={onExport}>Export CSV</button>
        </div>
      </div>
      <div className="overflow-auto scrollbar-thin">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Host</th>
              <th>Path</th>
              <th>Type</th>
              <th>FME</th>
              <th>ABT</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-sm text-[#9aa3b2]">{r.time}</td>
                <td className="text-sm">{r.host}</td>
                <td className="text-sm font-mono text-[#9aa3b2]">{r.path}</td>
                <td className="text-sm">
                  <span className="badge">{r.type}</span>
                </td>
                <td className="text-sm">{r.fme.toFixed(3)}</td>
                <td className="text-sm">{r.abt.toFixed(2)}</td>
                <td className="text-sm">
                  <span
                    className="badge"
                    style={{ borderColor: severityColor[r.severity], color: severityColor[r.severity] }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: severityColor[r.severity] }}
                    />
                    {r.severity.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#9aa3b2]">
                  No alerts yet. Monitoring in progress…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileMonitorPanel({
  events,
}: {
  events: { ts: string; path: string; action: 'created' | 'modified' | 'deleted'; fme: number }[];
}) {
  const colorForAction = (a: 'created' | 'modified' | 'deleted') =>
    a === 'created' ? '#22c55e' : a === 'modified' ? '#60a5fa' : '#ef4444';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-[#9aa3b2]">Filesystem</div>
          <div className="text-lg font-semibold">Real-time Monitoring</div>
        </div>
        <div className="badge">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          Live
        </div>
      </div>
      <div className="space-y-2 max-h-72 overflow-auto scrollbar-thin">
        {events.map((e, idx) => (
          <div key={`${e.ts}:${idx}`} className="flex items-center justify-between rounded-lg border border-[#1f2a3d] bg-[#0b1220] p-2">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorForAction(e.action) }}
              />
              <div className="text-sm">
                <span className="text-[#9aa3b2]">{e.ts}</span>{' '}
                <span className="font-mono">{e.path}</span>
              </div>
            </div>
            <div className="text-xs">
              <span className="text-[#9aa3b2]">FME:</span>{' '}
              <span>{e.fme.toFixed(3)}</span>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-sm text-[#9aa3b2]">No file events yet…</div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [events, setEvents] = useState<
    { ts: string; path: string; action: 'created' | 'modified' | 'deleted'; fme: number }[]
  >([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  const [isSignIn, setIsSignIn] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertRow['severity'] | 'all'>('all');

  // WebSocket for real-time updates
  const { isConnected, lastMessage, sendMessage, connectionError: wsError } = useWebSocket(userEmail);

  // Update connection error state
  useEffect(() => {
    setConnectionError(wsError);
  }, [wsError]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    console.log(`[WebSocket] Received message. lastMessage:`, lastMessage);
    switch (lastMessage.type) {
      case 'new_alert':
        const newAlert: AlertRow = {
          id: lastMessage.data.id.toString(),
          time: new Date(lastMessage.data.created_at).toLocaleString(),
          host: lastMessage.data.host,
          path: lastMessage.data.path,
          severity: lastMessage.data.severity,
          fme: lastMessage.data.fme,
          abt: lastMessage.data.abt,
          type: lastMessage.data.type,
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 100));
        console.log(`[Page] Added new alert:`, newAlert);
        break;

      case 'new_file_event':
        const newEvent = {
          ts: new Date(lastMessage.data.created_at).toLocaleTimeString(),
          path: lastMessage.data.path,
          action: lastMessage.data.action,
          fme: lastMessage.data.fme,
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 50));
        console.log(`[Page] Added new file event:`, newEvent);
        break;

      case 'metrics_update':
        // Update metrics if needed
        break;
    }
  }, [lastMessage]);

  // Check authentication on mount
  useEffect(() => {
    const token = apiClient.getToken();
    if (token) {
      apiClient.getCurrentUser()
        .then(user => {
          setUserEmail(user.email);
          setIsAuthenticated(true);
          loadInitialData();
          console.log(`[Page] Authenticated as: ${user.email}`);
        })
        .catch(() => {
          apiClient.clearToken();
        });
    }
  }, []);

  const loadInitialData = async () => {
    try {
      const [alertsData, eventsData, statusData] = await Promise.all([
        apiClient.getAlerts({ limit: 100 }),
        apiClient.getFileEvents({ limit: 50 }),
        apiClient.getMonitoringStatus(),
      ]);
      console.log(`[Data] Loaded initial data. alertsData:`, alertsData);

      setAlerts(alertsData.map((alert: any) => ({
        id: alert.id.toString(),
        time: new Date(alert.created_at).toLocaleString(),
        host: alert.host,
        path: alert.path,
        severity: alert.severity,
        fme: alert.fme,
        abt: alert.abt,
        type: alert.type,
      })));

      setEvents(eventsData.map((event: any) => ({
        ts: new Date(event.created_at).toLocaleTimeString(),
        path: event.path,
        action: event.action,
        fme: event.fme,
      })));

      setMonitoringStatus(statusData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      await apiClient.login(email, password);
      setUserEmail(email);
      setIsAuthenticated(true);
      setLoginError('');
      loadInitialData();
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      await apiClient.register(userData);
      // After successful registration, login
      await handleLogin(userData.email, userData.password);
    } catch (error: any) {
      setLoginError(error.message || 'Registration failed');
    }
  };

  const handleStartMonitoring = async () => {
    try {
      await apiClient.startMonitoring(['/tmp/test_ransomguard']);
      const status = await apiClient.getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await apiClient.stopMonitoring();
      const status = await apiClient.getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const handleCreateTestData = async () => {
    try {
      await Promise.all([
        apiClient.createTestAlert(),
        apiClient.createTestFileEvent(),
      ]);
      // Data will be received via WebSocket
    } catch (error) {
      console.error('Error creating test data:', error);
    }
  };

  const totals = useMemo(() => {
    const source = alerts;
    const critical = source.filter((a) => a.severity === 'critical').length;
    const high = source.filter((a) => a.severity === 'high').length;
    const ransomware = source.filter((a) => a.type === 'Ransomware').length;
    const raas = source.filter((a) => a.type === 'RaaS').length;
    return { critical, high, ransomware, raas, total: source.length };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'all') return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const exportAlertsCsv = () => {
    const header = ['Time', 'Host', 'Path', 'Type', 'FME', 'ABT', 'Severity'];
    const rows = filteredAlerts.map((r) => [
      r.time,
      r.host,
      r.path,
      r.type,
      r.fme.toFixed(3),
      r.abt.toFixed(2),
      r.severity.toUpperCase(),
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `alerts-${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthPanel 
            isSignIn={isSignIn}
            setIsSignIn={setIsSignIn}
            onLogin={handleLogin}
            onRegister={handleRegister}
            error={loginError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Connection status indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
            <span className="text-sm text-[#9aa3b2]">
              {isConnected ? 'Real-time connected' : 'Disconnected'}
            </span>
            {connectionError && (
              <span className="text-xs text-[#ef4444] ml-2">
                {connectionError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="btn btn-secondary"
              onClick={handleCreateTestData}
            >
              Create Test Data
            </button>
            {monitoringStatus?.status === 'running' ? (
              <button 
                className="btn btn-secondary"
                onClick={handleStopMonitoring}
              >
                Stop Monitoring
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={handleStartMonitoring}
              >
                Start Monitoring
              </button>
            )}
          </div>
        </div>

        {/* Show connection error banner */}
        {connectionError && (
          <div className="card p-4 border border-[#ef4444]/30 bg-[#ef4444]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                <span className="text-sm text-[#ef4444]">Connection Error</span>
                <span className="text-xs text-[#9aa3b2]">{connectionError}</span>
              </div>
              <button 
                className="text-xs text-[#60a5fa] hover:underline"
                onClick={() => {
                  setConnectionError(null);
                  loadInitialData();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Top metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Alerts" value={String(totals.total)} delta={{ value: '+12%', positive: true }} accent="blue" />
          <MetricCard title="Critical Severity" value={String(totals.critical)} delta={{ value: '-3%', positive: false }} accent="red" />
          <MetricCard title="Ransomware Detections" value={String(totals.ransomware)} delta={{ value: '+5%', positive: true }} accent="yellow" />
          <MetricCard title="RaaS Signals" value={String(totals.raas)} delta={{ value: '+2%', positive: true }} accent="cyan" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FileMonitorPanel events={events} />
            <AlertsTable 
              rows={filteredAlerts}
              onExport={exportAlertsCsv}
              filterControl={
                <select
                  className="input"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as AlertRow['severity'] | 'all')}
                >
                  <option value="all">All severities</option>
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              }
            />
          </div>
          <div className="space-y-6">
            <div className="card p-5">
              <div className="text-sm text-[#9aa3b2]">User</div>
              <div className="text-lg font-semibold">{userEmail}</div>
              <button 
                className="btn btn-secondary mt-3 w-full"
                onClick={() => {
                  apiClient.clearToken();
                  setIsAuthenticated(false);
                  setUserEmail(null);
                }}
              >
                Logout
              </button>
            </div>
            <div className="card p-5">
              <div className="text-sm text-[#9aa3b2]">Monitoring Status</div>
              <div className="text-lg font-semibold">
                {monitoringStatus?.status || 'Unknown'}
              </div>
              {monitoringStatus?.background_services && (
                <div className="mt-2 text-xs text-[#9aa3b2]">
                  Retention: {monitoringStatus.background_services.retention} | 
                  Metrics: {monitoringStatus.background_services.metrics}
                </div>
              )}
            </div>
            <div className="card p-5">
              <div className="text-sm text-[#9aa3b2]">ABT Threshold</div>
              <div className="text-lg font-semibold">Adaptive Burst</div>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-[#0b1220]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#60a5fa] to-[#22d3ee]"
                    style={{ width: `${Math.min(100, (monitoringStatus?.abt || 2) * 20).toFixed(0)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-[#9aa3b2]">
                  Current ABT: {(monitoringStatus?.abt || 2).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 text-center text-sm text-[#9aa3b2]">
          © {new Date().getFullYear()} RansomGuard • Dark SOC UI • Real-time Monitoring Active
        </footer>
      </div>
    </div>
  );
}
