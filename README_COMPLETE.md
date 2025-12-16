# RansomGuard - Complete Ransomware Detection System

## Overview

RansomGuard is a full-stack ransomware detection system that provides real-time monitoring, alerting, and analysis of file system activities. The system uses advanced algorithms including File Mutation Entropy (FME) and Adaptive Burst Threshold (ABT) to detect potential ransomware attacks.

## Architecture

### Backend (Python FastAPI)
- **Authentication**: JWT-based user authentication
- **File Monitoring**: Real-time file system monitoring with FME calculation
- **Detection Engine**: ABT algorithm and pattern recognition
- **Database**: SQLite for alerts and events storage
- **WebSocket**: Real-time updates to frontend
- **Background Jobs**: Data retention and metrics updates

### Frontend (Next.js/React)
- **Dark SOC UI**: Professional security operations center interface
- **Real-time Dashboard**: Live updates via WebSocket
- **Authentication Forms**: Login and registration
- **Alert Management**: View and filter alerts
- **Metrics Display**: Real-time statistics and charts

## Features

### Detection Capabilities
- **File Mutation Entropy (FME)**: Detects encrypted files by analyzing entropy
- **Adaptive Burst Threshold (ABT)**: Identifies rapid file modifications
- **Pattern Recognition**: Detects suspicious file extensions
- **RaaS Detection**: Identifies Ransomware-as-a-Service patterns
- **Real-time Monitoring**: Continuous file system surveillance

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- Secure WebSocket connections

### Data Management
- Automatic data retention (30 days for alerts, 7 days for events)
- Background cleanup jobs
- Real-time metrics calculation
- WebSocket-based live updates

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or pnpm

### Backend Setup

1. Navigate to the backend directory:
