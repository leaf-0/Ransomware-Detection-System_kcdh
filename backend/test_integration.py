#!/usr/bin/env python3
import os
import sys
import time
import json
import requests
import asyncio
import websockets

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

def test_authentication():
    """Test authentication endpoints"""
    print("Testing Authentication...")
    
    # Register a test user
    register_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{API_BASE}/register", json=register_data)
        if response.status_code == 200:
            print("✓ User registration successful")
        else:
            print(f"✗ Registration failed: {response.text}")
    except Exception as e:
        print(f"✗ Registration error: {e}")
    
    # Login
    login_data = {
        "username": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/token", data=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            print("✓ Login successful")
            return token
        else:
            print(f"✗ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Login error: {e}")
        return None

def test_api_endpoints(token):
    """Test API endpoints"""
    print("\nTesting API Endpoints...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test metrics
    try:
        response = requests.get(f"{API_BASE}/metrics", headers=headers)
        if response.status_code == 200:
            print("✓ Metrics endpoint working")
            print(f"  Total alerts: {response.json()['total_alerts']}")
        else:
            print(f"✗ Metrics endpoint failed: {response.text}")
    except Exception as e:
        print(f"✗ Metrics error: {e}")
    
    # Test alerts
    try:
        response = requests.get(f"{API_BASE}/alerts", headers=headers)
        if response.status_code == 200:
            alerts = response.json()
            print(f"✓ Alerts endpoint working ({len(alerts)} alerts)")
        else:
            print(f"✗ Alerts endpoint failed: {response.text}")
    except Exception as e:
        print(f"✗ Alerts error: {e}")
    
    # Test monitoring status
    try:
        response = requests.get(f"{API_BASE}/monitoring/status", headers=headers)
        if response.status_code == 200:
            status = response.json()
            print(f"✓ Monitoring status: {status['status']}")
            if 'background_services' in status:
                print(f"  Background services: {status['background_services']}")
        else:
            print(f"✗ Monitoring status failed: {response.text}")
    except Exception as e:
        print(f"✗ Monitoring status error: {e}")

async def test_websocket(token):
    """Test WebSocket connection"""
    print("\nTesting WebSocket...")
    
    try:
        # Extract user email from token (simplified)
        user_email = "test@example.com"
        ws_url = f"{WS_BASE}/ws/{user_email}"
        
        async with websockets.connect(ws_url) as websocket:
            print("✓ WebSocket connected")
            
            # Send a test message
            await websocket.send(json.dumps({"type": "test", "data": "hello"}))
            
            # Wait for response
            response = await websocket.recv()
            message = json.loads(response)
            print(f"✓ WebSocket response: {message}")
            
            # Create test data and wait for WebSocket updates
            print("\nCreating test data...")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Create test alert
            requests.post(f"{API_BASE}/test/alert", headers=headers)
            
            # Wait for WebSocket message
            response = await websocket.recv()
            message = json.loads(response)
            print(f"✓ Received real-time alert: {message['type']}")
            
    except Exception as e:
        print(f"✗ WebSocket error: {e}")

def test_background_services(token: str):
    """Test background services"""
    print("\nTesting Background Services...")
    
    # Create some test data to trigger background processes
    test_dir = "/tmp/test_ransomguard"
    os.makedirs(test_dir, exist_ok=True)

    # Ensure monitoring is running
    try:
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.post(f"{API_BASE}/monitoring/start", json=[test_dir], headers=headers)
        if resp.status_code == 200:
            print("✓ Monitoring started")
        else:
            print(f"ℹ Monitoring start response: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"ℹ Could not start monitoring: {e}")
    
    # Create test files
    for i in range(5):
        with open(f"{test_dir}/bg_test_{i}.dat", "wb") as f:
            f.write(os.urandom(1024))
    
    print("✓ Created test files for background processing")
    
    # Wait a bit for processing
    time.sleep(2)
    
    print("✓ Background services test completed")

if __name__ == "__main__":
    print("=" * 60)
    print("RansomGuard Integration Test")
    print("=" * 60)
    print("Note: Make sure the backend server is running on localhost:8000")
    print()
    
    # Test authentication
    token = test_authentication()
    
    if token:
        # Test API endpoints
        test_api_endpoints(token)
        
        # Test WebSocket
        asyncio.run(test_websocket(token))
        
        # Test background services
        test_background_services(token)
    
    print("\n" + "=" * 60)
    print("Integration test completed!")
    print("=" * 60)
