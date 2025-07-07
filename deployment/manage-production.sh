#!/bin/bash

# Survey AI 프로덕션 관리 스크립트
# 사용법: ./manage-production.sh [vps-ip] [command]

VPS_IP=${1:-"your-vps-ip"}
COMMAND=${2:-"status"}

case $COMMAND in
    "status")
        echo "📊 서비스 상태 확인..."
        ssh root@$VPS_IP << 'EOF'
            cd /opt/survey-ai
            echo "=== Docker 컨테이너 상태 ==="
            docker-compose -f docker-compose.prod.yml ps
            echo ""
            echo "=== 시스템 리소스 사용량 ==="
            docker stats --no-stream
            echo ""
            echo "=== 최근 로그 ==="
            docker-compose -f docker-compose.prod.yml logs --tail=20
        EOF
        ;;
    
    "logs")
        echo "📋 실시간 로그 확인..."
        ssh root@$VPS_IP "cd /opt/survey-ai && docker-compose -f docker-compose.prod.yml logs -f"
        ;;
    
    "restart")
        echo "🔄 서비스 재시작..."
        ssh root@$VPS_IP << 'EOF'
            cd /opt/survey-ai
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d
            echo "✅ 서비스 재시작 완료"
        EOF
        ;;
    
    "update")
        echo "🔄 코드 업데이트 및 재배포..."
        ssh root@$VPS_IP << 'EOF'
            cd /opt/survey-ai
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml build --no-cache
            docker-compose -f docker-compose.prod.yml up -d
            echo "✅ 업데이트 완료"
        EOF
        ;;
    
    "backup")
        echo "💾 데이터베이스 백업..."
        ssh root@$VPS_IP << 'EOF'
            cd /opt/survey-ai
            BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"
            mkdir -p $BACKUP_DIR
            
            # Docker 볼륨 백업
            docker run --rm -v survey-ai_supabase_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/supabase_backup.tar.gz -C /data .
            
            echo "✅ 백업 완료: $BACKUP_DIR"
        EOF
        ;;
    
    "scale")
        echo "📈 서비스 스케일링..."
        SCALE=${3:-"1"}
        ssh root@$VPS_IP "cd /opt/survey-ai && docker-compose -f docker-compose.prod.yml up -d --scale backend=$SCALE"
        ;;
    
    "cleanup")
        echo "🧹 불필요한 Docker 리소스 정리..."
        ssh root@$VPS_IP << 'EOF'
            docker system prune -f
            docker volume prune -f
            echo "✅ 정리 완료"
        EOF
        ;;
    
    *)
        echo "사용법: ./manage-production.sh [vps-ip] [command]"
        echo "명령어:"
        echo "  status   - 서비스 상태 확인"
        echo "  logs     - 실시간 로그 확인"
        echo "  restart  - 서비스 재시작"
        echo "  update   - 코드 업데이트"
        echo "  backup   - 데이터베이스 백업"
        echo "  scale N  - 백엔드 스케일링 (N개 인스턴스)"
        echo "  cleanup  - Docker 리소스 정리"
        ;;
esac 