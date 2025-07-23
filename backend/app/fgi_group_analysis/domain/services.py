from typing import List, Dict, Any, Optional
from app.fgi_group_analysis.domain.entities import GroupAnalysisResult, GroupComparisonRequest, GroupComparisonResult
from app.fgi_group_analysis.infra.supabase_client import get_supabase
from datetime import datetime
from app.fgi_group_analysis.infra.openai_client import OpenAIClient
from ..api.ws_router import ws_send_group_analysis_progress
import json

class GroupAnalysisService:
    """그룹별 분석 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.openai_client = OpenAIClient()
    
    async def get_group_analyses_by_guide(self, guide_file_name: str, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다."""
        try:
            # fgi_subject_analyses 테이블에서 해당 가이드라인의 분석 결과 조회 (동기 방식)
            response = self.supabase.table('fgi_subject_analyses').select(
                'id, title, description, topics, results, group_name, created_at'
            ).eq('guide_file_name', guide_file_name).eq('user_id', user_id).execute()
            
            if response.data:
                # 그룹별로 분석 결과 그룹화
                groups = {}
                for analysis in response.data:
                    group_name = analysis.get('group_name', 'Unknown Group')
                    if group_name not in groups:
                        groups[group_name] = []
                    groups[group_name].append(analysis)
                
                return groups
            else:
                return {}
                
        except Exception as e:
            print(f"Error fetching group analyses: {e}")
            return {}

    async def compare_groups(self, guide_file_name: str, user_id: str, group_names: List[str], job_id: Optional[str] = None) -> Dict[str, Any]:
        """선택된 그룹들의 분석 결과를 비교합니다."""
        try:
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": "그룹 분석 데이터 조회 중...",
                    "current": 0,
                    "total": 100,
                    "step": "data_fetch"
                })
            
            # 각 그룹의 분석 결과 가져오기
            groups_data = await self.get_group_analyses_by_guide(guide_file_name, user_id)
            
            # 선택된 그룹들만 필터링
            selected_groups = {name: groups_data[name] for name in group_names if name in groups_data}
            
            if len(selected_groups) < 2:
                raise ValueError("비교할 그룹이 2개 이상 필요합니다.")
            
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": f"선택된 그룹 {len(selected_groups)}개 분석 준비 완료",
                    "current": 10,
                    "total": 100,
                    "step": "groups_selected"
                })
            
            # 주제별 개별 분석 수행
            topic_comparisons = await self._analyze_topics_individually(selected_groups, job_id)
            
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": "주제별 분석 완료, 최종 종합 분석 중...",
                    "current": 80,
                    "total": 100,
                    "step": "final_analysis"
                })
            
            # 주제별 분석 결과를 종합하여 최종 비교 분석 수행
            final_analysis = await self._create_final_comparison(selected_groups, topic_comparisons, job_id)
            
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": "그룹 비교 분석 완료!",
                    "current": 100,
                    "total": 100,
                    "step": "completed",
                    "status": "completed"
                })
            
            return final_analysis
            
        except Exception as e:
            print(f"Error comparing groups: {e}")
            raise e
    
    async def _analyze_topics_individually(self, groups_data: Dict[str, List[Dict[str, Any]]], job_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """각 주제별로 개별 분석을 수행합니다."""
        topic_comparisons = {}
        
        # 모든 그룹에서 주제 목록 추출
        all_topics = set()
        for group_name, analyses in groups_data.items():
            for analysis in analyses:
                topics = analysis.get('topics', [])
                all_topics.update(topics)
        
        total_topics = len(all_topics)
        
        if job_id:
            await ws_send_group_analysis_progress(job_id, {
                "progress": f"총 {total_topics}개 주제 분석 시작",
                "current": 15,
                "total": 100,
                "step": "topic_analysis_start"
            })
        
        # 주제별로 개별 분석 수행
        for i, topic in enumerate(sorted(all_topics)):
            print(f"Analyzing topic: {topic}")
            
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": f"주제 '{topic}' 분석 중... ({i+1}/{total_topics})",
                    "current": 15 + int((i / total_topics) * 60),
                    "total": 100,
                    "step": "topic_analysis",
                    "topic": topic,
                    "topic_index": i
                })
            
            topic_analysis = await self._analyze_single_topic(groups_data, topic)
            topic_comparisons[topic] = topic_analysis
            
            if job_id:
                await ws_send_group_analysis_progress(job_id, {
                    "progress": f"주제 '{topic}' 분석 완료",
                    "current": 15 + int(((i+1) / total_topics) * 60),
                    "total": 100,
                    "step": "topic_analysis",
                    "topic": topic,
                    "topic_index": i,
                    "topic_summary": topic_analysis
                })
        
        return topic_comparisons
    
    async def _analyze_single_topic(self, groups_data: Dict[str, List[Dict[str, Any]]], topic: str) -> Dict[str, Any]:
        """단일 주제에 대한 그룹별 비교 분석을 수행합니다."""
        try:
            # 각 그룹에서 해당 주제의 분석 결과 추출
            topic_data = {}
            for group_name, analyses in groups_data.items():
                for analysis in analyses:
                    topics = analysis.get('topics', [])
                    results = analysis.get('results', [])
                    
                    # 해당 주제의 인덱스 찾기
                    if topic in topics:
                        topic_index = topics.index(topic)
                        if topic_index < len(results):
                            result = results[topic_index]
                            topic_data[group_name] = {
                                'title': analysis.get('title', 'N/A'),
                                'result': result.get('result', str(result)) if isinstance(result, dict) else str(result)
                            }
                            break
            
            if len(topic_data) < 2:
                return {
                    "common_points": "비교할 데이터가 부족합니다.",
                    "differences": "비교할 데이터가 부족합니다.",
                    "insights": "비교할 데이터가 부족합니다."
                }
            
            # 주제별 비교 분석을 위한 프롬프트 생성
            topic_text = self._format_topic_for_comparison(topic, topic_data)
            
            prompt = f"""
            다음은 같은 주제에 대한 두 그룹의 FGI 분석 결과입니다.
            각 그룹의 분석 결과를 비교하여 다음 형식으로 JSON 응답을 제공해주세요:
            
            {{
                "common_points": "공통점 분석 (1-2문단)",
                "differences": "차이점 분석 (1-2문단)",
                "insights": "주요 인사이트 (1-2문단)"
            }}
            
            주제: {topic}
            
            분석 데이터:
            {topic_text}
            
            공통점, 차이점, 인사이트를 명확히 구분하여 분석해주세요.
            """
            
            # OpenAI API 호출
            messages = [
                {"role": "system", "content": "당신은 FGI 분석 전문가입니다. 그룹별 분석 결과를 비교하여 인사이트를 도출하는 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
            result_text = await self.openai_client.call(messages, model="gpt-4", temperature=0.3)
            
            # JSON 파싱 시도
            try:
                result_json = json.loads(result_text)
                return result_json
            except json.JSONDecodeError:
                return {
                    "common_points": result_text,
                    "differences": "분석 결과를 확인해주세요.",
                    "insights": "분석 결과를 확인해주세요."
                }
                
        except Exception as e:
            print(f"Error analyzing topic {topic}: {e}")
            return {
                "common_points": f"주제 '{topic}' 분석 중 오류가 발생했습니다.",
                "differences": "다시 시도해주세요.",
                "insights": "다시 시도해주세요."
            }
    
    async def _create_final_comparison(self, groups_data: Dict[str, List[Dict[str, Any]]], topic_comparisons: Dict[str, Dict[str, Any]], job_id: Optional[str] = None) -> Dict[str, Any]:
        """주제별 분석 결과를 종합하여 최종 비교 분석을 수행합니다."""
        try:
            # 최종 분석을 위한 요약 데이터 생성
            summary_data = self._format_summary_for_final_analysis(groups_data, topic_comparisons)
            
            prompt = f"""
            다음은 주제별 그룹 비교 분석 결과를 종합한 데이터입니다.
            이를 바탕으로 전체적인 비교 요약과 종합 권장사항을 제공해주세요.
            
            반드시 다음 JSON 형식으로만 응답해주세요:
            {{
                "summary": "전체적인 비교 요약 (2-3문단)",
                "recommendations": "종합 권장사항 (2-3문단)"
            }}
            
            종합 데이터:
            {summary_data}
            
            전체적인 관점에서 두 그룹의 차이점과 공통점을 요약하고, 실무적 권장사항을 제시해주세요.
            
            중요: 반드시 JSON 형식으로만 응답하고, 다른 텍스트는 포함하지 마세요.
            """
            
            # OpenAI API 호출
            messages = [
                {"role": "system", "content": "당신은 FGI 분석 전문가입니다. 주제별 분석 결과를 종합하여 전체적인 인사이트를 도출하는 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
            result_text = await self.openai_client.call(messages, model="gpt-4", temperature=0.3)
            
            # JSON 파싱 시도
            try:
                result_json = json.loads(result_text)
                return {
                    "summary": result_json.get("summary", "전체 비교 요약을 생성할 수 없습니다."),
                    "topic_comparisons": topic_comparisons,
                    "recommendations": result_json.get("recommendations", "종합 권장사항을 생성할 수 없습니다.")
                }
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 텍스트에서 요약과 권장사항을 추출
                print(f"JSON 파싱 실패, 원본 텍스트: {result_text}")
                
                # 텍스트에서 요약과 권장사항을 추출하는 간단한 로직
                summary = "전체 비교 요약을 생성할 수 없습니다."
                recommendations = "종합 권장사항을 생성할 수 없습니다."
                
                # 텍스트에 "요약" 또는 "summary"가 포함되어 있으면 요약으로 사용
                if "요약" in result_text or "summary" in result_text.lower():
                    lines = result_text.split('\n')
                    summary_lines = []
                    for line in lines:
                        if any(keyword in line.lower() for keyword in ['요약', 'summary', '전체', '종합']):
                            summary_lines.append(line)
                    if summary_lines:
                        summary = '\n'.join(summary_lines)
                
                # 텍스트에 "권장" 또는 "recommendation"이 포함되어 있으면 권장사항으로 사용
                if "권장" in result_text or "recommendation" in result_text.lower():
                    lines = result_text.split('\n')
                    rec_lines = []
                    for line in lines:
                        if any(keyword in line.lower() for keyword in ['권장', 'recommendation', '제안', '방안']):
                            rec_lines.append(line)
                    if rec_lines:
                        recommendations = '\n'.join(rec_lines)
                
                return {
                    "summary": summary,
                    "topic_comparisons": topic_comparisons,
                    "recommendations": recommendations
                }
                
        except Exception as e:
            print(f"Error in final comparison: {e}")
            return {
                "summary": "최종 비교 분석 중 오류가 발생했습니다.",
                "topic_comparisons": topic_comparisons,
                "recommendations": "다시 시도해주세요."
            }
    
    def _format_topic_for_comparison(self, topic: str, topic_data: Dict[str, Dict[str, Any]]) -> str:
        """단일 주제 비교를 위한 텍스트를 포맷팅합니다."""
        formatted_text = f"주제: {topic}\n\n"
        
        for group_name, data in topic_data.items():
            formatted_text += f"=== {group_name} ===\n"
            formatted_text += f"제목: {data['title']}\n"
            formatted_text += f"분석 결과: {data['result']}\n\n"
        
        return formatted_text
    
    def _format_summary_for_final_analysis(self, groups_data: Dict[str, List[Dict[str, Any]]], topic_comparisons: Dict[str, Dict[str, Any]]) -> str:
        """최종 분석을 위한 요약 데이터를 포맷팅합니다."""
        formatted_text = "=== 그룹별 개요 ===\n"
        
        for group_name, analyses in groups_data.items():
            formatted_text += f"\n{group_name}:\n"
            for analysis in analyses:
                formatted_text += f"- 제목: {analysis.get('title', 'N/A')}\n"
                formatted_text += f"- 주제 수: {len(analysis.get('topics', []))}개\n"
        
        formatted_text += "\n=== 주제별 비교 요약 ===\n"
        
        for topic, comparison in topic_comparisons.items():
            formatted_text += f"\n주제: {topic}\n"
            formatted_text += f"- 공통점: {comparison.get('common_points', 'N/A')}\n"
            formatted_text += f"- 차이점: {comparison.get('differences', 'N/A')}\n"
            formatted_text += f"- 인사이트: {comparison.get('insights', 'N/A')}\n"
        
        return formatted_text
    
    async def _analyze_group_comparison(self, groups_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """OpenAI를 사용하여 그룹 비교 분석을 수행합니다."""
        try:
            # 분석 데이터를 텍스트로 변환
            analysis_text = self._format_groups_for_comparison(groups_data)
            
            # OpenAI 프롬프트 생성
            prompt = f"""
            다음은 같은 가이드라인으로 진행된 두 그룹의 FGI 분석 결과입니다. 
            각 그룹의 분석 결과를 비교하여 다음 형식으로 JSON 응답을 제공해주세요:
            
            {{
                "summary": "전체적인 비교 요약 (2-3문단)",
                "topic_comparisons": {{
                    "주제명": {{
                        "common_points": "공통점 분석",
                        "differences": "차이점 분석", 
                        "insights": "주요 인사이트"
                    }}
                }},
                "recommendations": "종합 권장사항 (2-3문단)"
            }}
            
            분석 데이터:
            {analysis_text}
            
            각 주제별로 공통점, 차이점, 인사이트를 명확히 구분하여 분석해주세요.
            """
            
            # OpenAI API 호출
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "당신은 FGI 분석 전문가입니다. 그룹별 분석 결과를 비교하여 인사이트를 도출하는 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=4000
            )
            
            # 응답 파싱
            result_text = response.choices[0].message.content
            
            # JSON 파싱 시도
            try:
                result_json = json.loads(result_text)
                return result_json
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 텍스트를 구조화된 형태로 반환
                return {
                    "summary": result_text,
                    "topic_comparisons": {},
                    "recommendations": "상세한 비교 분석 결과를 확인해주세요."
                }
                
        except Exception as e:
            print(f"Error in OpenAI analysis: {e}")
            return {
                "summary": "그룹 비교 분석 중 오류가 발생했습니다.",
                "topic_comparisons": {},
                "recommendations": "다시 시도해주세요."
            }
    
    def _format_groups_for_comparison(self, groups_data: Dict[str, List[Dict[str, Any]]]) -> str:
        """그룹 데이터를 비교 분석용 텍스트로 포맷팅합니다."""
        formatted_text = ""
        
        for group_name, analyses in groups_data.items():
            formatted_text += f"\n=== {group_name} ===\n"
            
            for analysis in analyses:
                formatted_text += f"\n제목: {analysis.get('title', 'N/A')}\n"
                formatted_text += f"설명: {analysis.get('description', 'N/A')}\n"
                
                # 주제별 결과
                topics = analysis.get('topics', [])
                results = analysis.get('results', [])
                
                for i, topic in enumerate(topics):
                    formatted_text += f"\n주제 {i+1}: {topic}\n"
                    if i < len(results):
                        result = results[i]
                        if isinstance(result, dict):
                            formatted_text += f"분석 결과: {result.get('result', 'N/A')}\n"
                        else:
                            formatted_text += f"분석 결과: {result}\n"
                
                formatted_text += "\n" + "="*50 + "\n"
        
        return formatted_text 