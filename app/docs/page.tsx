'use client';

export default function DocsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card p-5">
          <div className="text-sm text-[#9aa3b2]">Documentation</div>
          <div className="text-lg font-semibold">RansomGuard Overview</div>
          <p className="mt-3 text-sm text-[#9aa3b2]">
            RansomGuard provides real-time filesystem monitoring, alerting, and analytics. Use the dashboard to authenticate,
            start monitoring, review alerts and file events, and export CSVs. WebSocket connections are secured with your JWT.
          </p>
          <div className="mt-4">
            <ul className="list-disc pl-5 text-sm text-[#9aa3b2] space-y-2">
              <li>Authentication: Register or sign in to obtain a JWT token.</li>
              <li>Monitoring: Start/stop monitoring on server-side paths (default: /tmp/test_ransomguard).</li>
              <li>Alerts: Generated based on FME and ABT with types Ransomware, RaaS, Suspicious, or Benign.</li>
              <li>WebSocket: Live updates for alerts and file events; reconnection handled automatically.</li>
              <li>Export: Use “Export CSV” in the Alerts table to download current filtered alerts.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
