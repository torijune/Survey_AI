import asyncio
from typing import Dict, Any, Optional, List
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv

load_dotenv()

class PlannerState:
    """설문 계획 상태를 관리하는 클래스"""
    def __init__(self, **kwargs):
        self.topic = kwargs.get("topic", "")
        self.lang = kwargs.get("lang", "한국어")
        self.objective = kwargs.get("objective", "")
        self.generated_objective = kwargs.get("generated_objective", "")
        self.audience = kwargs.get("audience", "")
        self.structure = kwargs.get("structure", "")
        self.questions = kwargs.get("questions", "")
        self.analysis = kwargs.get("analysis", "")
        self.validation_checklist = kwargs.get("validation_checklist", "")

class PlannerWorkflow:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    async def make_openai_call(self, messages: List[Dict[str, str]], model: str = "gpt-4o-mini", temperature: float = 0.3) -> str:
        """OpenAI API 호출"""
        try:
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                else:
                    langchain_messages.append(HumanMessage(content=msg["content"]))
            
            response = await self.llm.ainvoke(langchain_messages)
            return response.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API 호출 실패: {str(e)}")
    
    async def intro_agent_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """소개 분석 노드"""
        if on_step:
            on_step("intro")
        
        print('[Planner] introAgentNode 실행', state.__dict__)
        
        prompt = f"""당신은 설문 조사 전문가입니다. 다음 주제와 목적에 대해 분석해주세요.

주제: {state.topic}
목적: {state.objective}

다음 형식으로 분석해주세요:
1. 조사 목적 정리
2. 핵심 조사 영역
3. 예상 결과 활용 방안

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] introAgentNode 응답', content)
        
        state.generated_objective = content
        return state
    
    async def audience_agent_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """타겟 응답자 분석 노드"""
        if on_step:
            on_step("audience")
        
        print('[Planner] audienceAgentNode 실행', state.__dict__)
        
        prompt = f"""다음 주제와 목적에 맞는 타겟 응답자를 분석해주세요.

주제: {state.topic}
목적: {state.generated_objective}

다음 형식으로 분석해주세요:
1. 타겟 응답자 특성
2. 표본 크기 권장사항
3. 표본 추출 방법
4. 응답률 고려사항

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] audienceAgentNode 응답', content)
        
        state.audience = content
        return state
    
    async def structure_agent_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """설문 구조 계획 노드"""
        if on_step:
            on_step("structure")
        
        print('[Planner] structureAgentNode 실행', state.__dict__)
        
        prompt = f"""다음 정보를 바탕으로 설문 구조를 계획해주세요.

주제: {state.topic}
목적: {state.generated_objective}
타겟: {state.audience}

다음 형식으로 계획해주세요:
1. 설문 섹션 구성
2. 각 섹션별 목적
3. 문항 배치 순서
4. 예상 소요 시간

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] structureAgentNode 응답', content)
        
        state.structure = content
        return state
    
    async def question_agent_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """문항 제안 노드"""
        if on_step:
            on_step("question")
        
        print('[Planner] questionAgentNode 실행', state.__dict__)
        
        prompt = f"""다음 정보를 바탕으로 구체적인 문항을 제안해주세요.

주제: {state.topic}
목적: {state.generated_objective}
타겟: {state.audience}
구조: {state.structure}

다음 형식으로 제안해주세요:
1. 각 섹션별 구체 문항
2. 문항 유형 (객관식/주관식)
3. 응답 척도
4. 문항 수

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] questionAgentNode 응답', content)
        
        state.questions = content
        return state
    
    async def analysis_agent_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """분석 방법 제안 노드"""
        if on_step:
            on_step("analysis")
        
        print('[Planner] analysisAgentNode 실행', state.__dict__)
        
        prompt = f"""다음 설문에 대한 분석 방법을 제안해주세요.

주제: {state.topic}
목적: {state.generated_objective}
문항: {state.questions}

다음 형식으로 제안해주세요:
1. 기술통계 분석
2. 추론통계 분석
3. 교차분석 계획
4. 시각화 방법

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] analysisAgentNode 응답', content)
        
        state.analysis = content
        return state
    
    async def survey_validation_checklist_node(self, state: PlannerState, on_step=None) -> PlannerState:
        """설문 검증 체크리스트 노드"""
        if on_step:
            on_step("validationChecklist")
        
        print('[Planner] surveyValidationChecklistNode 실행', state.__dict__)
        
        # 문항 길이 제한
        max_question_length = 1000
        safe_questions = (state.questions or "")[:max_question_length]
        
        prompt = f"""다음 설문에 대한 검증 체크리스트를 작성해주세요.

주제: {state.topic}
목적: {state.generated_objective}
문항: {safe_questions}

다음 항목들을 체크해주세요:
1. 문항의 명확성
2. 응답 옵션의 적절성
3. 설문 길이의 적절성
4. 편향 가능성
5. 개선 제안사항

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 설문 조사 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        content = await self.make_openai_call(messages)
        print('[Planner] surveyValidationChecklistNode 응답', content)
        
        # 빈 응답 처리
        if not content or content.strip() == "":
            state.validation_checklist = None
        else:
            state.validation_checklist = content
        
        return state
    
    async def execute(self, topic: str, objective: str, lang: str = "한국어", on_step=None) -> Dict[str, Any]:
        """설문 계획 워크플로우 실행"""
        try:
            # 초기 상태 설정
            state = PlannerState(
                topic=topic,
                objective=objective,
                lang=lang
            )
            
            # 워크플로우 실행
            state = await self.intro_agent_node(state, on_step)
            state = await self.audience_agent_node(state, on_step)
            state = await self.structure_agent_node(state, on_step)
            state = await self.question_agent_node(state, on_step)
            state = await self.analysis_agent_node(state, on_step)
            state = await self.survey_validation_checklist_node(state, on_step)
            
            return {
                "success": True,
                "result": {
                    "generated_objective": state.generated_objective,
                    "audience": state.audience,
                    "structure": state.structure,
                    "questions": state.questions,
                    "analysis": state.analysis,
                    "validation_checklist": state.validation_checklist
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 