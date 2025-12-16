#!/usr/bin/env python3
import os
import sys
import time
import random

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def create_test_files():
    """Create test files with different entropy levels"""
    test_dir = "/tmp/test_ransomguard"
    
    # Create a normal text file (low entropy)
    with open(f"{test_dir}/normal.txt", "w") as f:
        f.write("This is a normal text file with low entropy.\n")
        f.write("It contains readable English text.\n")
        f.write("Entropy should be relatively low.\n")
    
    # Create a file with medium entropy (mixed content)
    with open(f"{test_dir}/mixed.dat", "wb") as f:
        f.write(b"Normal text" + os.urandom(100) + b"More text" + os.urandom(50))
    
    # Create a high entropy file (encrypted-like)
    with open(f"{test_dir}/encrypted.enc", "wb") as f:
        f.write(os.urandom(1024))
    
    # Create more files to trigger burst detection
    for i in range(10):
        with open(f"{test_dir}/burst_{i}.tmp", "wb") as f:
            f.write(os.urandom(512))
    
    print("Test files created in /tmp/test_ransomguard")

def simulate_ransomware():
    """Simulate ransomware-like activity"""
    test_dir = "/tmp/test_ransomguard"
    
    # Simulate file encryption by overwriting with random data
    files = ["normal.txt", "mixed.dat"]
    for filename in files:
        filepath = f"{test_dir}/{filename}"
        if os.path.exists(filepath):
            # Create "encrypted" version
            with open(f"{filepath}.encrypted", "wb") as f:
                f.write(os.urandom(2048))
            print(f"Simulated encryption of {filename}")

if __name__ == "__main__":
    print("Creating test files for ransomware detection...")
    create_test_files()
    
    print("\nSimulating ransomware activity...")
    simulate_ransomware()
    
    print("\nTest files created. Start the monitoring service to detect these changes.")
    print("Run: python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
