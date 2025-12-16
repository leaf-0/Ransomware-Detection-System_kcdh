#!/usr/bin/env python3
import os
import sys
import time
import signal
import threading

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from monitoring import start_file_monitoring, stop_file_monitoring, get_monitoring_status

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print("\nShutting down monitoring service...")
    stop_file_monitoring()
    sys.exit(0)

def main():
    """Main monitoring service"""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("Starting RansomGuard File Monitoring Service...")
    
    # Define paths to monitor
    watch_paths = [
        "/tmp/test_ransomguard",
        os.path.expanduser("~/Documents"),
        os.path.expanduser("~/Downloads"),
    ]
    
    # Start monitoring
    if start_file_monitoring(watch_paths):
        print("Monitoring started successfully")
        print(f"Watching paths: {watch_paths}")
        
        # Status loop
        try:
            while True:
                time.sleep(10)
                status = get_monitoring_status()
                print(f"Status: {status['status']}, ABT: {status['abt']:.2f}, Recent events: {status['recent_events']}")
        except KeyboardInterrupt:
            pass
    else:
        print("Failed to start monitoring")
        sys.exit(1)

if __name__ == "__main__":
    main()
