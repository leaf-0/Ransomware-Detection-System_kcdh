const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const users = new Map();
const alerts = [];
const fileEvents = [];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    users.set(email, { email, password, first_name, last_name });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ detail: 'Registration failed' });
  }
});

app.post('/token', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.get(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }
    
    res.json({ access_token: 'mock-jwt-token-' + username });
  } catch (error) {
    res.status(500).json({ detail: 'Authentication failed' });
  }
});

app.get('/alerts', (req, res) => {
  res.json(alerts);
});

app.get('/file-events', (req, res) => {
  res.json(fileEvents);
});

app.post('/monitoring/start', (req, res) => {
  res.json({ status: 'running', paths: ['/tmp/test_ransomguard'] });
});

app.post('/monitoring/stop', (req, res) => {
  res.json({ status: 'stopped', paths: [] });
});

app.get('/monitoring/status', (req, res) => {
  res.json({ status: 'stopped', paths: [], background_services: { retention: '7d', metrics: 'active' } });
});

app.post('/test/alert', (req, res) => {
  const testAlert = {
    id: Date.now().toString(),
    host: 'test-host',
    path: '/test/file.txt',
    severity: 'high',
    fme: 8.5,
    abt: 3.2,
    type: 'RaaS',
    created_at: new Date().toISOString()
  };
  alerts.unshift(testAlert);
  res.json(testAlert);
});

app.post('/test/file-event', (req, res) => {
  const testEvent = {
    id: Date.now().toString(),
    path: '/test/monitored-file.txt',
    action: 'modified',
    timestamp: new Date().toISOString(),
    fme: 6.7
  };
  fileEvents.unshift(testEvent);
  res.json(testEvent);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
});
