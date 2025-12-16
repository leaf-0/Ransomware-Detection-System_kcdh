#!/usr/bin/env python3
import os
import sys
import math

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from monitoring import FileMutationEntropy, AdaptiveBurstThreshold, RansomwareDetector

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

def test_ransomware_detector():
    """Test the complete ransomware detection system"""
    print("Testing Ransomware Detector...")
    
    detector = RansomwareDetector()
    
    test_files = [
        ("/tmp/test_ransomguard/normal.txt", "created"),
        ("/tmp/test_ransomguard/encrypted.enc", "created"),
        ("/tmp/test_ransomguard/mixed.dat", "modified"),
    ]
    
    for file_path, action in test_files:
        if os.path.exists(file_path):
            is_suspicious, analysis = detector.analyze_file_change(file_path, action)
            print(f"\nFile: {os.path.basename(file_path)}")
            print(f"  FME: {analysis['fme']:.3f}")
            print(f"  ABT: {analysis['abt']:.2f}")
            print(f"  Severity: {analysis['severity']}")
            print(f"  Type: {analysis['type']}")
            print(f"  Suspicious: {is_suspicious}")
            if analysis['reasons']:
                print(f"  Reasons: {', '.join(analysis['reasons'])}")
    
    print()

if __name__ == "__main__":
    import time
    
    print("=" * 60)
    print("RansomGuard Detection System Test")
    print("=" * 60)
    print()
    
    test_fme_calculation()
    test_abt_algorithm()
    test_ransomware_detector()
    
    print("=" * 60)
    print("Test completed!")
    print("=" * 60)
