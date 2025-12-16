# RansomGuard File Monitoring System

## Overview

The RansomGuard monitoring system provides real-time ransomware detection using:
- **File Mutation Entropy (FME)**: Calculates Shannon entropy to detect encrypted files
- **Adaptive Burst Threshold (ABT)**: Detects rapid file changes indicative of ransomware
- **Pattern Recognition**: Identifies suspicious file extensions and behaviors

## Components

### 1. FileMutationEntropy Class
- Calculates Shannon entropy of file content
- Samples files at multiple positions for accuracy
- High entropy (>7.5) indicates possible encryption
- Medium entropy (>6.0) indicates suspicious activity

### 2. AdaptiveBurstThreshold Class
- Tracks file events in a sliding time window
- Adapts threshold based on normal activity patterns
- Detects burst activity (rapid file modifications)
- Prevents false positives during normal operations

### 3. RansomwareDetector Class
- Combines FME and ABT analysis
- Checks for suspicious file extensions
- Identifies Ransomware-as-a-Service (RaaS) patterns
- Generates alerts with severity levels

### 4. FileSystemMonitor Class
- Real-time file system monitoring
- Creates database records for events and alerts
- Runs in separate thread for non-blocking operation

## API Endpoints

### Monitoring Control
- `POST /monitoring/start` - Start file monitoring
- `POST /monitoring/stop` - Stop file monitoring  
- `GET /monitoring/status` - Get monitoring status

### Data Retrieval
- `GET /alerts` - Retrieve ransomware alerts
- `GET /file-events` - Retrieve file system events
- `GET /metrics` - Get dashboard metrics

### Test Endpoints
- `POST /test/alert` - Create test alert
- `POST /test/file-event` - Create test file event

## Detection Logic

### Ransomware Indicators
1. **High Entropy Files** (>7.5): Likely encrypted
2. **Suspicious Extensions**: .enc, .locked, .crypted, .crypto, .ransom
3. **Burst Activity**: Rapid file modifications
4. **RaaS Patterns**: Multiple high-entropy files

### Severity Levels
- **Critical**: High entropy + suspicious patterns
- **High**: Rapid encryption detected
- **Medium**: Medium entropy or suspicious activity
- **Low**: Burst activity only
- **Info**: Normal file operations

## Usage Examples

### Start Monitoring
