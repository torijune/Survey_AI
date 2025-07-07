# 🚀 Survey AI 배포 체크리스트

## 📋 **1단계: VPS 서버 준비**

### [ ] VPS 서버 선택 및 구매
- **추천 서비스:**
  - DigitalOcean: $6-12/월 (1-2GB RAM)
  - Vultr: $5-10/월 (1-2GB RAM)
  - AWS Lightsail: $7-15/월 (1-2GB RAM)
  - Naver Cloud: ₩15,000-30,000/월 (1-2GB RAM)

### [ ] 도메인 구매 및 설정
- 도메인 구매 (예: survey-ai.com)
- DNS 설정 (A 레코드 → VPS IP)

### [ ] SSH 키 설정
```bash
# SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# VPS에 SSH 키 등록
ssh-copy-id root@your-vps-ip
```

## 📋 **2단계: 환경변수 설정**

### [ ] 프로덕션 환경변수 확인
```bash
# .env.production 파일 생성
cp env.example .env.production

# 다음 값들을 실제 값으로 변경:
- OPENAI_API_KEY=sk-...
- NEXTAUTH_SECRET=생성된_시크릿
- NEXTAUTH_URL=https://your-domain.com
- NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
- NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### [ ] Supabase 프로덕션 설정
- Supabase 프로젝트 생성
- 프로덕션 데이터베이스 설정
- RLS (Row Level Security) 설정

## 📋 **3단계: 로컬 테스트**

### [ ] Docker 이미지 빌드 테스트
```bash
# 프로덕션 이미지 빌드
docker-compose -f docker-compose.prod.yml build

# 로컬에서 테스트 실행
docker-compose -f docker-compose.prod.yml up -d
```

### [ ] API 엔드포인트 테스트
```bash
# 백엔드 헬스체크
curl http://localhost:8000/health

# 프론트엔드 접속
curl http://localhost:3000
```

## 📋 **4단계: 배포 실행**

### [ ] 배포 스크립트 실행
```bash
# 배포 실행
./deploy-production.sh your-vps-ip your-domain.com

# 배포 상태 확인
./manage-production.sh your-vps-ip status
```

### [ ] SSL 인증서 설정
```bash
# Let's Encrypt SSL 인증서 자동 설정
# (배포 스크립트에서 자동 처리됨)
```

## 📋 **5단계: 배포 후 검증**

### [ ] 서비스 상태 확인
```bash
# 컨테이너 상태 확인
./manage-production.sh your-vps-ip status

# 실시간 로그 확인
./manage-production.sh your-vps-ip logs
```

### [ ] 기능 테스트
- [ ] FGI 분석 기능
- [ ] 설문 분석 기능
- [ ] 통계 테스트 기능
- [ ] 사용자 인증 기능
- [ ] 파일 업로드 기능

### [ ] 성능 테스트
```bash
# 부하 테스트 (선택사항)
ab -n 100 -c 10 https://your-domain.com/
```

## 📋 **6단계: 모니터링 설정**

### [ ] 로그 모니터링
```bash
# 실시간 로그 확인
./manage-production.sh your-vps-ip logs
```

### [ ] 리소스 모니터링
```bash
# 시스템 리소스 확인
ssh root@your-vps-ip 'htop'
```

## 📋 **7단계: 백업 설정**

### [ ] 자동 백업 스크립트 설정
```bash
# 백업 실행
./manage-production.sh your-vps-ip backup
```

## 🚨 **문제 해결**

### 자주 발생하는 문제들:
1. **포트 충돌**: `docker-compose down && docker-compose up -d`
2. **메모리 부족**: VPS 스펙 업그레이드 또는 리소스 제한 조정
3. **SSL 인증서 오류**: `certbot renew`
4. **데이터베이스 연결 오류**: Supabase 설정 확인

## 📞 **지원**

문제가 발생하면:
1. 로그 확인: `./manage-production.sh your-vps-ip logs`
2. 서비스 재시작: `./manage-production.sh your-vps-ip restart`
3. 코드 업데이트: `./manage-production.sh your-vps-ip update` 