const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const JWT_SECRET = 'your-secret-key-change-in-production';
const PORT = 8002;

// In-memory storage (in production, use a proper database)
const users = new Map();
const alerts = [];
const fileEvents = [];
const monitoringStatus = { status: 'stopped', paths: [], background_services: { retention: '7d', metrics: 'active' } };
const abtThreshold = 2.0;
const connectedClients = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// File Metadata Extraction (FME)
function extractFileMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      hash,
      extension: path.extname(filePath),
      isExecutable: stats.mode & parseInt('111', 8),
      entropy: calculateEntropy(fileBuffer),
      suspiciousPatterns: detectSuspiciousPatterns(fileBuffer)
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
}

// Calculate file entropy (higher entropy = more likely encrypted)
function calculateEntropy(buffer) {
  const frequency = new Array(256).fill(0);
  for (let i = 0; i < buffer.length; i++) {
    frequency[buffer[i]]++;
  }
  
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0) {
      const probability = frequency[i] / buffer.length;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return entropy;
}

// Detect suspicious patterns in files
function detectSuspiciousPatterns(buffer) {
  const patterns = [];
  const content = buffer.toString('binary', 0, Math.min(1024, buffer.length));
  
  // Check for ransomware extensions
  const ransomExtensions = ['.locked', '.encrypted', '.crypted', '.crypto'];
  if (ransomExtensions.some(ext => content.includes(ext))) {
    patterns.push('RANSOMWARE_EXTENSION');
  }
  
  // Check for high entropy (likely encrypted)
  const entropy = calculateEntropy(buffer);
  if (entropy > 7.5) {
    patterns.push('HIGH_ENTROPY');
  }
  
  // Check for ransom notes
  const ransomNoteKeywords = ['bitcoin', 'payment', 'decrypt', 'restore', 'files'];
  if (ransomNoteKeywords.some(keyword => content.toLowerCase().includes(keyword))) {
    patterns.push('RANSOM_NOTE');
  }
  
  return patterns;
}

// Adaptive Burst Threshold (ABT) calculation
function calculateABT(events, timeWindow = 60000) { // 1 minute window
  const now = Date.now();
  const recentEvents = events.filter(event => 
    now - new Date(event.timestamp).getTime() < timeWindow
  );
  
  const burstRate = recentEvents.length / (timeWindow / 1000);
  return Math.max(abtThreshold, burstRate * 1.5); // Adaptive threshold
}

// Ransomware detection logic
function detectRansomware(fileMetadata, recentEvents) {
  const riskScore = 0;
  const reasons = [];
  
  // High entropy files are suspicious
  if (fileMetadata.entropy > 7.5) {
    riskScore += 30;
    reasons.push('High file entropy (possible encryption)');
  }
  
  // Suspicious patterns
  if (fileMetadata.suspiciousPatterns.length > 0) {
    riskScore += 25 * fileMetadata.suspiciousPatterns.length;
    reasons.push(`Suspicious patterns: ${fileMetadata.suspiciousPatterns.join(', ')}`);
  }
  
  // Rapid file modifications
  const abt = calculateABT(recentEvents);
  if (recentEvents.length > abt) {
    riskScore += 35;
    reasons.push(`Rapid file modifications (${recentEvents.length} > ${abt} threshold)`);
  }
  
  // File extension changes
  if (fileMetadata.extension === '.locked' || fileMetadata.extension === '.encrypted') {
    riskScore += 40;
    reasons.push('Suspicious file extension');
  }
  
  // Determine severity and type
  let severity = 'info';
  let type = 'Benign';
  
  if (riskScore >= 80) {
    severity = 'critical';
    type = 'Ransomware';
  } else if (riskScore >= 60) {
    severity = 'high';
    type = 'RaaS';
  } else if (riskScore >= 40) {
    severity = 'medium';
    type = 'Suspicious';
  } else if (riskScore >= 20) {
    severity = 'low';
    type = 'Suspicious';
  }
  
  return { riskScore, severity, type, reasons, fme: fileMetadata.entropy, abt };
}

// File system watcher
let watcher = null;

function startFileWatcher(paths) {
  if (watcher) {
    watcher.close();
  }
  
  watcher = chokidar.watch(paths, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('all', (eventType, filePath) => {
    const event = {
      id: uuidv4(),
      path: filePath,
      action: eventType,
      timestamp: new Date().toISOString(),
      fme: 0
    };
    
    // Extract metadata if file exists
    if (fs.existsSync(filePath) && eventType !== 'unlink') {
      const metadata = extractFileMetadata(filePath);
      if (metadata) {
        event.fme = metadata.entropy;
        
        // Run ransomware detection
        const recentEvents = fileEvents.slice(-50); // Last 50 events
        const detection = detectRansomware(metadata, recentEvents);
        
        if (detection.severity !== 'info') {
          const alert = {
            id: uuidv4(),
            host: 'localhost',
            path: filePath,
            severity: detection.severity,
            fme: detection.fme,
            abt: detection.abt,
            type: detection.type,
            created_at: new Date().toISOString(),
            reasons: detection.reasons
          };
          
          alerts.unshift(alert);
          
          // Broadcast alert to all connected clients
          broadcastToAll({
            type: 'new_alert',
            data: alert
          });
        }
      }
    }
    
    fileEvents.unshift(event);
    
    // Broadcast file event to all connected clients
    broadcastToAll({
      type: 'new_file_event',
      data: event
    });
    
    console.log(`File event: ${eventType} - ${filePath}`);
  });
  
  console.log(`Started watching: ${paths.join(', ')}`);
}

function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('Stopped file watching');
  }
}

// WebSocket broadcast function
function broadcastToAll(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const email = url.pathname.replace('/ws/', '');
  
  if (email) {
    connectedClients.set(email, ws);
    console.log(`WebSocket client connected: ${email}`);
    
    ws.on('close', () => {
      connectedClients.delete(email);
      console.log(`WebSocket client disconnected: ${email}`);
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from ${email}:`, data);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });
  }
});

// Authentication routes
app.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    if (users.has(email)) {
      return res.status(400).json({ detail: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(email, {
      email,
      password: hashedPassword,
      first_name,
      last_name,
      created_at: new Date().toISOString()
    });
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ detail: 'Registration failed' });
  }
});

app.post('/token', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.get(username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ access_token: token });
  } catch (error) {
    res.status(500).json({ detail: 'Authentication failed' });
  }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ detail: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ detail: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Protected routes
app.get('/users/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.email);
  if (!user) {
    return res.status(404).json({ detail: 'User not found' });
  }
  res.json({ email: user.email, first_name: user.first_name, last_name: user.last_name });
});

// Alerts endpoints
app.get('/alerts', authenticateToken, (req, res) => {
  const { skip = 0, limit = 100, severity } = req.query;
  let filteredAlerts = alerts;
  
  if (severity) {
    filteredAlerts = alerts.filter(alert => alert.severity === severity);
  }
  
  const paginatedAlerts = filteredAlerts.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
  res.json(paginatedAlerts);
});

app.post('/alerts', authenticateToken, (req, res) => {
  const alert = {
    id: uuidv4(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  alerts.unshift(alert);
  broadcastToAll({ type: 'new_alert', data: alert });
  res.json(alert);
});

// File events endpoints
app.get('/file-events', authenticateToken, (req, res) => {
  const { skip = 0, limit = 50 } = req.query;
  const paginatedEvents = fileEvents.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
  res.json(paginatedEvents);
});

app.post('/file-events', authenticateToken, (req, res) => {
  const event = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  fileEvents.unshift(event);
  broadcastToAll({ type: 'new_file_event', data: event });
  res.json(event);
});

// Monitoring endpoints
app.post('/monitoring/start', authenticateToken, (req, res) => {
  const paths = req.body || ['/tmp/test_ransomguard'];
  
  // Create test directory if it doesn't exist
  paths.forEach(path => {
    if (!fs.existsSync(path)) {
      fs.ensureDirSync(path);
    }
  });
  
  monitoringStatus.status = 'running';
  monitoringStatus.paths = paths;
  startFileWatcher(paths);
  
  res.json(monitoringStatus);
});

app.post('/monitoring/stop', authenticateToken, (req, res) => {
  monitoringStatus.status = 'stopped';
  monitoringStatus.paths = [];
  stopFileWatcher();
  
  res.json(monitoringStatus);
});

app.get('/monitoring/status', authenticateToken, (req, res) => {
  res.json(monitoringStatus);
});

// Test endpoints
app.post('/test/alert', authenticateToken, (req, res) => {
  const testAlert = {
    id: uuidv4(),
    host: 'test-host',
    path: '/test/file.txt',
    severity: 'high',
    fme: 8.5,
    abt: 3.2,
    type: 'RaaS',
    created_at: new Date().toISOString()
  };
  
  alerts.unshift(testAlert);
  broadcastToAll({ type: 'new_alert', data: testAlert });
  res.json(testAlert);
});

app.post('/test/file-event', authenticateToken, (req, res) => {
  const testEvent = {
    id: uuidv4(),
    path: '/test/monitored-file.txt',
    action: 'modified',
    timestamp: new Date().toISOString(),
    fme: 6.7
  };
  
  fileEvents.unshift(testEvent);
  broadcastToAll({ type: 'new_file_event', data: testEvent });
  res.json(testEvent);
});

// Metrics endpoint
app.get('/metrics', authenticateToken, (req, res) => {
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const ransomware = alerts.filter(a => a.type === 'Ransomware').length;
  const raas = alerts.filter(a => a.type === 'RaaS').length;
  
  res.json({
    total_alerts: alerts.length,
    critical_alerts: critical,
    high_alerts: high,
    ransomware_detections: ransomware,
    raas_signals: raas,
    file_events: fileEvents.length,
    monitoring_active: monitoringStatus.status === 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`Ransomware detection server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  stopFileWatcher();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
