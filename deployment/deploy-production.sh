#!/bin/bash

# Survey AI 프로덕션 배포 스크립트
# 사용법: ./deploy-production.sh [vps-ip] [domain]

set -e

VPS_IP=${1:-"your-vps-ip"}
DOMAIN=${2:-"your-domain.com"}

echo "🚀 Survey AI 프로덕션 배포 시작..."
echo "VPS IP: $VPS_IP"
echo "도메인: $DOMAIN"

# 1. 로컬에서 Docker 이미지 빌드
echo "📦 Docker 이미지 빌드 중..."
docker-compose -f docker-compose.prod.yml build

# 2. 환경변수 파일 생성
echo "🔧 환경변수 설정..."
cat > .env.production << EOF
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://$DOMAIN
PYTHON_BACKEND_URL=https://$DOMAIN/api
OPENAI_API_KEY=${OPENAI_API_KEY}
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
EOF

# 3. VPS에 배포
echo "🌐 VPS에 배포 중..."
ssh root@$VPS_IP << 'EOF'
# 시스템 업데이트
apt-get update && apt-get upgrade -y

# Docker 설치 (없는 경우)
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# Docker Compose 설치
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 프로젝트 디렉토리 생성
mkdir -p /opt/survey-ai
cd /opt/survey-ai

# Nginx 설치 및 설정
apt-get install -y nginx certbot python3-certbot-nginx

# SSL 인증서 설정
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# 방화벽 설정
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
EOF

# 4. 프로젝트 파일 전송
echo "📤 프로젝트 파일 전송 중..."
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' ./ root@$VPS_IP:/opt/survey-ai/

# 5. VPS에서 서비스 시작
echo "🚀 서비스 시작 중..."
ssh root@$VPS_IP << 'EOF'
cd /opt/survey-ai

# 환경변수 파일 복사
cp .env.production .env

# Docker Compose로 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 확인
echo "📋 서비스 로그:"
docker-compose -f docker-compose.prod.yml logs --tail=50
EOF

echo "✅ 배포 완료!"
echo "🌐 접속 URL: https://$DOMAIN"
echo "📊 모니터링: ssh root@$VPS_IP 'docker-compose -f /opt/survey-ai/docker-compose.prod.yml logs -f'" 