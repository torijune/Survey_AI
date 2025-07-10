# Survey AI Backend - Clean Architecture

이 프로젝트는 FastAPI를 사용한 설문 분석 AI 백엔드로, Clean Architecture 패턴을 적용하여 구성되었습니다.

## 🏗️ 아키텍처 구조

```
backend/app/
├── api/                    # API Layer (FastAPI 라우터)
│   └── v1/
│       └── planner/
│           └── router.py   # Planner API 엔드포인트
├── domain/                 # Domain Layer (비즈니스 로직)
│   └── planner/
│       ├── entities.py     # 데이터 모델, 엔티티
│       ├── services.py     # 비즈니스 로직 서비스
│       └── use_cases.py    # 유스케이스 (서비스 조합)
├── infrastructure/         # Infrastructure Layer (외부 연동)
│   └── openai/
│       └── client.py       # OpenAI LLM 클라이언트
└── workflows/             # Workflows Layer (기존 호환성)
    └── planner/
        └── workflow.py     # 기존 PlannerWorkflow 호환성
```

## 📋 계층별 역할

### 1. API Layer (`api/`)
- FastAPI 라우터 정의
- Request/Response 모델 처리
- 의존성 주입 및 유스케이스 호출

### 2. Domain Layer (`domain/`)
- **entities.py**: 데이터 구조, Pydantic 모델
- **services.py**: 핵심 비즈니스 로직
- **use_cases.py**: 여러 서비스를 조합한 유스케이스

### 3. Infrastructure Layer (`infrastructure/`)
- 외부 시스템 연동 (OpenAI, Database, File System 등)
- 외부 API 클라이언트

### 4. Workflows Layer (`workflows/`)
- 기존 코드와의 호환성을 위한 레이어
- 여러 유스케이스를 조합한 파이프라인

## 🔄 의존성 방향

```
API → Use Cases → Services → Infrastructure
```

- 각 계층은 자신보다 안쪽 계층에만 의존
- 외부 계층은 내부 계층을 알 수 없음
- 의존성 역전 원칙 적용

## 🚀 사용 예시

### 기존 방식 (Monolithic)
```python
from workflows.planner_workflow import PlannerWorkflow

workflow = PlannerWorkflow()
result = await workflow.execute(topic, objective, lang)
```

### Clean Architecture 방식
```python
from app.domain.planner.use_cases import CreateSurveyPlanUseCase
from app.domain.planner.services import PlannerService
from app.infrastructure.openai.client import OpenAIClient

# 의존성 주입
openai_client = OpenAIClient()
planner_service = PlannerService(openai_client)
use_case = CreateSurveyPlanUseCase(planner_service)

# 유스케이스 실행
result = await use_case.execute(topic, objective, lang)
```

## 🎯 장점

1. **테스트 용이성**: 각 계층을 독립적으로 테스트 가능
2. **유지보수성**: 비즈니스 로직과 인프라 분리
3. **확장성**: 새로운 기능 추가 시 해당 계층만 수정
4. **의존성 관리**: 명확한 의존성 방향으로 복잡성 감소

## 📝 추가 계획

- [ ] FGI 워크플로우 Clean Architecture 분리
- [ ] Table Analysis 워크플로우 Clean Architecture 분리
- [ ] Visualization 워크플로우 Clean Architecture 분리
- [ ] 의존성 주입 컨테이너 도입
- [ ] 단위 테스트 추가 