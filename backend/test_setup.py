#!/usr/bin/env python3
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    from database import Base, engine
    from models import User, Alert, FileEvent
    print("✓ All imports successful")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully")
    
    print("✓ Backend setup complete!")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
