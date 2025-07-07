import logging
import time
import psutil
import requests
from datetime import datetime
import os

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class SystemMonitor:
    def __init__(self):
        self.start_time = time.time()
    
    def get_system_stats(self):
        """시스템 리소스 사용량 확인"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available': memory.available,
            'disk_percent': disk.percent,
            'disk_free': disk.free,
            'uptime': time.time() - self.start_time
        }
    
    def check_health(self):
        """헬스체크 수행"""
        try:
            response = requests.get('http://localhost:8000/health', timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def log_stats(self):
        """시스템 통계 로깅"""
        stats = self.get_system_stats()
        health_status = "OK" if self.check_health() else "FAILED"
        
        logger.info(f"System Stats - CPU: {stats['cpu_percent']}%, "
                   f"Memory: {stats['memory_percent']}%, "
                   f"Disk: {stats['disk_percent']}%, "
                   f"Health: {health_status}")
        
        # 임계값 체크
        if stats['cpu_percent'] > 80:
            logger.warning(f"High CPU usage: {stats['cpu_percent']}%")
        
        if stats['memory_percent'] > 80:
            logger.warning(f"High memory usage: {stats['memory_percent']}%")
        
        if stats['disk_percent'] > 90:
            logger.warning(f"High disk usage: {stats['disk_percent']}%")

def main():
    """모니터링 메인 함수"""
    monitor = SystemMonitor()
    
    while True:
        try:
            monitor.log_stats()
            time.sleep(60)  # 1분마다 체크
        except KeyboardInterrupt:
            logger.info("Monitoring stopped")
            break
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main() 