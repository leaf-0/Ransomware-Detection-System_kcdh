import asyncio
import threading
from datetime import datetime, timedelta
from typing import Dict
import logging
import time
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import SessionLocal
from .models import Alert, FileEvent
from .websocket import manager

logger = logging.getLogger(__name__)

class RetentionManager:
    """Manages data retention policies for alerts and events"""
    
    def __init__(self):
        self.retention_periods = {
            'alerts': timedelta(days=30),  # Keep alerts for 30 days
            'file_events': timedelta(days=7),  # Keep file events for 7 days
            'critical_alerts': timedelta(days=90),  # Keep critical alerts longer
        }
        self.running = False
        self.cleanup_thread = None
    
    def start_retention_service(self):
        """Start the background retention service"""
        if self.running:
            logger.warning("Retention service is already running")
            return
        
        self.running = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
        logger.info("Retention service started")
    
    def stop_retention_service(self):
        """Stop the background retention service"""
        self.running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)
        logger.info("Retention service stopped")
    
    def _cleanup_loop(self):
        """Main cleanup loop running in background thread"""
        while self.running:
            try:
                self._perform_cleanup()
                # Run cleanup every 6 hours
                for _ in range(6 * 60):  # 6 hours * 60 minutes
                    if not self.running:
                        break
                    time.sleep(60)  # Check every minute if we should stop
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def _perform_cleanup(self):
        """Perform the actual data cleanup"""
        db = SessionLocal()
        try:
            now = datetime.now()
            
            # Clean up old file events
            event_cutoff = now - self.retention_periods['file_events']
            deleted_events = db.query(FileEvent).filter(
                FileEvent.created_at < event_cutoff
            ).delete()
            
            # Clean up old alerts (except critical ones)
            alert_cutoff = now - self.retention_periods['alerts']
            critical_cutoff = now - self.retention_periods['critical_alerts']
            
            deleted_alerts = db.query(Alert).filter(
                Alert.created_at < alert_cutoff,
                Alert.severity != 'critical'
            ).delete()
            
            # Clean up very old critical alerts
            deleted_critical = db.query(Alert).filter(
                Alert.created_at < critical_cutoff,
                Alert.severity == 'critical'
            ).delete()
            
            db.commit()
            
            total_deleted = deleted_events + deleted_alerts + deleted_critical
            if total_deleted > 0:
                logger.info(f"Cleanup completed: Deleted {total_deleted} old records")
                
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            db.rollback()
        finally:
            db.close()

class MetricsUpdater:
    """Periodically updates and broadcasts metrics"""
    
    def __init__(self):
        self.running = False
        self.metrics_thread = None
    
    def start_metrics_service(self):
        """Start the metrics update service"""
        if self.running:
            logger.warning("Metrics service is already running")
            return
        
        self.running = True
        self.metrics_thread = threading.Thread(target=self._metrics_loop, daemon=True)
        self.metrics_thread.start()
        logger.info("Metrics service started")
    
    def stop_metrics_service(self):
        """Stop the metrics update service"""
        self.running = False
        if self.metrics_thread:
            self.metrics_thread.join(timeout=5)
        logger.info("Metrics service stopped")
    
    def _metrics_loop(self):
        """Main metrics update loop"""
        while self.running:
            try:
                self._update_and_broadcast_metrics()
                # Update metrics every 30 seconds
                for _ in range(30):
                    if not self.running:
                        break
                    time.sleep(1)
            except Exception as e:
                logger.error(f"Error in metrics loop: {e}")
                time.sleep(10)
    
    def _update_and_broadcast_metrics(self):
        """Calculate current metrics and broadcast to connected users"""
        db = SessionLocal()
        try:
            # Calculate metrics
            total_alerts = db.query(Alert).count()
            critical_alerts = db.query(Alert).filter(Alert.severity == 'critical').count()
            high_alerts = db.query(Alert).filter(Alert.severity == 'high').count()
            ransomware_alerts = db.query(Alert).filter(Alert.type == 'Ransomware').count()
            raas_alerts = db.query(Alert).filter(Alert.type == 'RaaS').count()
            
            # Get recent activity
            recent_alerts = db.query(Alert).filter(
                Alert.created_at > datetime.now() - timedelta(hours=1)
            ).count()
            
            recent_events = db.query(FileEvent).filter(
                FileEvent.created_at > datetime.now() - timedelta(hours=1)
            ).count()
            
            metrics = {
                "total_alerts": total_alerts,
                "critical_alerts": critical_alerts,
                "high_alerts": high_alerts,
                "ransomware_alerts": ransomware_alerts,
                "raas_alerts": raas_alerts,
                "recent_alerts": recent_alerts,
                "recent_events": recent_events,
                "timestamp": datetime.now().isoformat()
            }
            # Avoid attempting to schedule asyncio tasks from a non-async thread.
            # Metrics are available via REST; broadcasting can be added via a thread-safe queue if needed.
            logger.debug(f"Metrics updated: {metrics}")
            
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
        finally:
            db.close()

# Global instances
retention_manager = RetentionManager()
metrics_updater = MetricsUpdater()

def start_background_services():
    """Start all background services"""
    retention_manager.start_retention_service()
    metrics_updater.start_metrics_service()
    logger.info("All background services started")

def stop_background_services():
    """Stop all background services"""
    retention_manager.stop_retention_service()
    metrics_updater.stop_metrics_service()
    logger.info("All background services stopped")

def get_background_services_status():
    """Get status of background services"""
    return {
        "retention": "running" if retention_manager.running else "stopped",
        "metrics": "running" if metrics_updater.running else "stopped"
    }
