#!/usr/bin/env python3
import os
import sys

# Test basic file structure
print("Testing backend structure...")

files_to_check = [
    "app/__init__.py",
    "app/main.py",
    "app/database.py",
    "app/models.py",
    "app/schemas.py",
    "app/auth.py",
    "requirements.txt",
    ".env"
]

for file in files_to_check:
    if os.path.exists(file):
        print(f"✓ {file} exists")
    else:
        print(f"✗ {file} missing")

print("\nBackend structure verification complete!")
print("Note: Python packages need to be installed to run the API server.")
print("To install packages, run: pip install -r requirements.txt")
print("To start the server, run: python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
