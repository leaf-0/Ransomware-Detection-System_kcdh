#!/bin/bash
echo "Starting RansomGuard Backend API..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
