import os
import time
import math
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import threading
import logging
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Alert, FileEvent, SeverityEnum, AlertTypeEnum, FileActionEnum
from .schemas import AlertResponse, FileEventResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileMutationEntropy:
    """Calculate File Mutation Entropy (FME) for ransomware detection"""
    
    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """Calculate Shannon entropy of file data"""
        if not data:
            return 0.0
        
        # Count byte frequencies
        byte_counts = [0] * 256
        for byte in data:
            byte_counts[byte] += 1
        
        # Calculate entropy
        entropy = 0.0
        data_len = len(data)
        
        for count in byte_counts:
            if count > 0:
                frequency = count / data_len
                entropy -= frequency * math.log2(frequency)
        
        return entropy
    
    @staticmethod
    def calculate_file_entropy(file_path: str, sample_size: int = 8192) -> float:
        """Calculate entropy of a file by sampling"""
        try:
            with open(file_path, 'rb') as f:
                # Read sample from beginning, middle, and end
                file_size = os.path.getsize(file_path)
                if file_size == 0:
                    return 0.0
                
                samples = []
                sample_positions = [0, file_size // 2, max(0, file_size - sample_size)]
                
                for pos in sample_positions:
                    f.seek(pos)
                    sample = f.read(min(sample_size, file_size - pos))
                    samples.append(sample)
                
                combined_sample = b''.join(samples)
                return FileMutationEntropy.calculate_entropy(combined_sample)
        except Exception as e:
            logger.error(f"Error calculating entropy for {file_path}: {e}")
            return 0.0

class AdaptiveBurstThreshold:
    """Adaptive Burst Threshold (ABT) algorithm for detecting rapid file changes"""
    
    def __init__(self, window_size: int = 60, burst_multiplier: float = 3.0):
        self.window_size = window_size  # seconds
        self.burst_multiplier = burst_multiplier
        self.file_events: List[Tuple[datetime, str]] = []
        self.lock = threading.Lock()
    
    def add_event(self, file_path: str):
        """Add a file event to the tracking window"""
        with self.lock:
            now = datetime.now()
            self.file_events.append((now, file_path))
            
            # Remove old events outside the window
            cutoff_time = now - timedelta(seconds=self.window_size)
            self.file_events = [(t, p) for t, p in self.file_events if t > cutoff_time]
    
    def calculate_abt(self) -> float:
        """Calculate the current Adaptive Burst Threshold"""
        with self.lock:
            if len(self.file_events) < 10:
                return 2.0  # Default threshold for low activity
            
            # Calculate baseline rate (events per second)
            recent_events = len(self.file_events)
            baseline_rate = recent_events / self.window_size
            
            # Calculate burst threshold
            abt = baseline_rate * self.burst_multiplier
            
            # Apply minimum and maximum bounds
            return max(1.0, min(10.0, abt))
    
    def is_burst_detected(self) -> bool:
        """Check if current activity exceeds burst threshold"""
        with self.lock:
            current_rate = len(self.file_events) / max(1, self.window_size)
            abt = self.calculate_abt()
            return current_rate > abt

class RansomwareDetector:
    """Main ransomware detection engine"""
    
    def __init__(self):
        self.fme_calculator = FileMutationEntropy()
        self.abt_algorithm = AdaptiveBurstThreshold()
        self.suspicious_extensions = {'.enc', '.locked', '.crypted', '.crypto', '.ransom'}
        self.high_entropy_threshold = 7.5
        self.medium_entropy_threshold = 6.0
        
    def analyze_file_change(self, file_path: str, action: str) -> Tuple[bool, Dict]:
        """Analyze a file change for ransomware indicators"""
        result = {
            'is_ransomware': False,
            'is_suspicious': False,
            'fme': 0.0,
            'abt': 0.0,
            'severity': SeverityEnum.info,
            'type': AlertTypeEnum.benign,
            'reasons': []
        }
        
        # Calculate FME
        fme = self.fme_calculator.calculate_file_entropy(file_path)
        result['fme'] = fme
        
        # Update ABT
        self.abt_algorithm.add_event(file_path)
        abt = self.abt_algorithm.calculate_abt()
        result['abt'] = abt
        
        # Check for suspicious file extensions
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext in self.suspicious_extensions:
            result['is_suspicious'] = True
            result['reasons'].append(f"Suspicious extension: {file_ext}")
        
        # Check entropy levels
        if fme > self.high_entropy_threshold:
            result['is_ransomware'] = True
            result['severity'] = SeverityEnum.critical
            result['type'] = AlertTypeEnum.ransomware
            result['reasons'].append(f"High entropy: {fme:.3f}")
        elif fme > self.medium_entropy_threshold:
            result['is_suspicious'] = True
            result['severity'] = SeverityEnum.medium
            result['type'] = AlertTypeEnum.suspicious
            result['reasons'].append(f"Medium entropy: {fme:.3f}")
        
        # Check for burst activity
        if self.abt_algorithm.is_burst_detected():
            result['is_suspicious'] = True
            if result['severity'] == SeverityEnum.info:
                result['severity'] = SeverityEnum.low
            result['reasons'].append("Burst activity detected")
        
        # Check for rapid file encryption patterns
        if action == 'modified' and fme > 6.5:
            result['is_ransomware'] = True
            result['severity'] = SeverityEnum.high
            result['type'] = AlertTypeEnum.ransomware
            result['reasons'].append("Rapid encryption pattern")
        
        # Check for RaaS indicators (multiple files with similar high entropy)
        if self._check_raas_pattern(file_path, fme):
            result['is_ransomware'] = True
            result['severity'] = SeverityEnum.critical
            result['type'] = AlertTypeEnum.raas
            result['reasons'].append("RaaS pattern detected")
        
        return result['is_ransomware'] or result['is_suspicious'], result
    
    def _check_raas_pattern(self, file_path: str, fme: float) -> bool:
        """Check for Ransomware-as-a-Service patterns"""
        # Simple heuristic: multiple files with high entropy in short time
        with self.abt_algorithm.lock:
            recent_high_entropy = sum(1 for _, path in self.abt_algorithm.file_events[-10:] 
                                    if self.fme_calculator.calculate_file_entropy(path) > 7.0)
            return recent_high_entropy >= 5

class FileSystemMonitor:
    """File system event handler for real-time monitoring"""
    
    def __init__(self, watch_paths: List[str], detector: RansomwareDetector):
        self.watch_paths = watch_paths
        self.detector = detector
        self.db_session = SessionLocal()
        self.running = False
        
    def start_monitoring(self):
        """Start monitoring the specified paths"""
        self.running = True
        logger.info(f"Started monitoring: {self.watch_paths}")
        
        # Create a simple polling mechanism since watchdog might not be available
        import threading
        
        def monitor_loop():
            last_files = set()
            while self.running:
                try:
                    current_files = set()
                    for path in self.watch_paths:
                        if os.path.exists(path):
                            for root, dirs, files in os.walk(path):
                                for file in files:
                                    file_path = os.path.join(root, file)
                                    current_files.add(file_path)
                                    
                                    # Check for new files
                                    if file_path not in last_files:
                                        self._process_file_event(file_path, 'created')
                    
                    # Check for deleted files
                    deleted_files = last_files - current_files
                    for file_path in deleted_files:
                        self._process_file_event(file_path, 'deleted')
                    
                    last_files = current_files
                    time.sleep(5)  # Poll every 5 seconds
                    
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(5)
        
        self.monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("File system monitoring started")
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.running = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=5)
        self.db_session.close()
        logger.info("File system monitoring stopped")
    
    def _process_file_event(self, file_path: str, action: str):
        """Process a file event and create alerts if necessary"""
        try:
            # Always create a file event record
            file_event = FileEvent(
                path=file_path,
                action=FileActionEnum(action),
                fme=self.detector.fme_calculator.calculate_file_entropy(file_path)
            )
            self.db_session.add(file_event)
            
            # Analyze for ransomware
            is_suspicious, analysis = self.detector.analyze_file_change(file_path, action)
            
            if is_suspicious:
                alert = Alert(
                    host=os.uname().nodename,
                    path=file_path,
                    severity=analysis['severity'],
                    fme=analysis['fme'],
                    abt=analysis['abt'],
                    type=analysis['type']
                )
                self.db_session.add(alert)
                logger.warning(f"Alert created: {analysis['type']} - {file_path}")
            
            self.db_session.commit()
            
        except Exception as e:
            logger.error(f"Error processing file event {file_path}: {e}")
            self.db_session.rollback()

# Global monitor instance
_monitor_instance: Optional[FileSystemMonitor] = None

def start_file_monitoring(watch_paths: List[str] = None) -> bool:
    """Start the file system monitoring in a separate thread"""
    global _monitor_instance
    
    if _monitor_instance is not None:
        logger.warning("File monitoring is already running")
        return False
    
    if watch_paths is None:
        # Default paths to monitor
        watch_paths = [
            "/tmp/test_ransomguard"
        ]
    
    try:
        detector = RansomwareDetector()
        _monitor_instance = FileSystemMonitor(watch_paths, detector)
        _monitor_instance.start_monitoring()
        
        logger.info(f"File monitoring started for paths: {watch_paths}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to start file monitoring: {e}")
        return False

def stop_file_monitoring():
    """Stop the file system monitoring"""
    global _monitor_instance
    
    if _monitor_instance is not None:
        _monitor_instance.stop_monitoring()
        _monitor_instance = None
        logger.info("File monitoring stopped")

def get_monitoring_status() -> Dict:
    """Get the current status of file monitoring"""
    global _monitor_instance
    
    if _monitor_instance is None:
        return {"status": "stopped", "paths": []}
    
    return {
        "status": "running" if _monitor_instance.running else "stopped",
        "paths": _monitor_instance.watch_paths,
        "abt": _monitor_instance.detector.abt_algorithm.calculate_abt(),
        "recent_events": len(_monitor_instance.detector.abt_algorithm.file_events)
    }
