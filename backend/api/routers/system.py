import psutil
import platform
import os
import time
from fastapi import APIRouter, Depends
from backend.api.routers.auth import get_admin_user
from backend.alchemy.models import User
from backend.alchemy.database import MysqlConnection

router = APIRouter(tags=["System"])

# Track when the server started
BOOT_TIME = time.time()

@router.get("/metrics")
def get_system_metrics(current_user: User = Depends(get_admin_user)):
    # Connect to MySQL to get row counts
    mysql = MysqlConnection()
    db_count = 0
    try:
        mysql.cursor.execute("SELECT COUNT(*) FROM flipkart_products")
        result = mysql.cursor.fetchone()
        if result:
            db_count = result[0]
    except Exception:
        pass

    # CPU
    cpu_usage = psutil.cpu_percent(interval=0.1)
    cpu_cores = psutil.cpu_count(logical=True)
    
    # Memory
    mem = psutil.virtual_memory()
    mem_usage = mem.percent
    mem_total = round(mem.total / (1024 ** 3), 2)  # GB
    mem_used = round(mem.used / (1024 ** 3), 2)    # GB

    # Disk
    disk = psutil.disk_usage('/')
    disk_usage = disk.percent
    disk_total = round(disk.total / (1024 ** 3), 2)  # GB
    disk_free = round(disk.free / (1024 ** 3), 2)    # GB

    # Uptime
    uptime_seconds = int(time.time() - BOOT_TIME)

    return {
        "status": "online",
        "uptime": uptime_seconds,
        "os": platform.system(),
        "database": {
            "total_products": db_count,
            "status": "connected"
        },
        "hardware": {
            "cpu_usage": cpu_usage,
            "cpu_cores": cpu_cores,
            "memory_usage": mem_usage,
            "memory_total_gb": mem_total,
            "memory_used_gb": mem_used,
            "disk_usage": disk_usage,
            "disk_total_gb": disk_total,
            "disk_free_gb": disk_free
        }
    }
