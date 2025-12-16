#!/bin/bash
echo "Starting RansomGuard Complete System..."
echo "======================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the backend server
echo "Starting backend server on http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo "WebSocket endpoint: ws://localhost:8000/ws/{user_email}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
