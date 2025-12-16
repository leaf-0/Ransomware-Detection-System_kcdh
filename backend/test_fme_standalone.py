#!/usr/bin/env python3
import os
import sys
import math
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import threading

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
            print(f"Error calculating entropy for {file_path}: {e}")
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

def test_fme_calculation():
    """Test File Mutation Entropy calculation"""
    print("Testing FME Calculation...")
    
    fme = FileMutationEntropy()
    
    # Test with known data
    # Low entropy data (repeating pattern)
    low_entropy_data = b"A" * 1000
    low_entropy = fme.calculate_entropy(low_entropy_data)
    print(f"Low entropy (repeating 'A'): {low_entropy:.3f}")
    
    # High entropy data (random)
    high_entropy_data = os.urandom(1000)
    high_entropy = fme.calculate_entropy(high_entropy_data)
    print(f"High entropy (random data): {high_entropy:.3f}")
    
    # Test with actual files
    test_files = [
        "/tmp/test_ransomguard/normal.txt",
        "/tmp/test_ransomguard/mixed.dat",
        "/tmp/test_ransomguard/encrypted.enc"
    ]
    
    for file_path in test_files:
        if os.path.exists(file_path):
            entropy = fme.calculate_file_entropy(file_path)
            print(f"File {os.path.basename(file_path)}: {entropy:.3f}")
    
    print()

def test_abt_algorithm():
    """Test Adaptive Burst Threshold algorithm"""
    print("Testing ABT Algorithm...")
    
    abt = AdaptiveBurstThreshold(window_size=10, burst_multiplier=2.0)
    
    # Add events slowly
    print("Adding events slowly...")
    for i in range(5):
        abt.add_event(f"/test/file_{i}.txt")
        time.sleep(0.5)
    
    print(f"ABT after slow events: {abt.calculate_abt():.2f}")
    print(f"Burst detected: {abt.is_burst_detected()}")
    
    # Add events quickly (burst)
    print("\nAdding events quickly (simulating burst)...")
    for i in range(10):
        abt.add_event(f"/test/burst_{i}.txt")
    
    print(f"ABT after burst: {abt.calculate_abt():.2f}")
    print(f"Burst detected: {abt.is_burst_detected()}")
    
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("RansomGuard Detection System Test (Standalone)")
    print("=" * 60)
    print()
    
    test_fme_calculation()
    test_abt_algorithm()
    
    print("=" * 60)
    print("Test completed!")
    print("=" * 60)
