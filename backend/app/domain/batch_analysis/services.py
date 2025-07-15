from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime
from .entities import BatchAnalysisJob, BatchAnalysisResult, BatchAnalysisLog
from ...infrastructure.database.batch_analysis_repository import BatchAnalysisRepository
from ...infrastructure.workflow.table_analysis_workflow import TableAnalysisWorkflow


class BatchAnalysisService:
    """배치 분석 비즈니스 로직 서비스"""
    
    def __init__(self, repository: BatchAnalysisRepository, workflow: TableAnalysisWorkflow):
        self.repository = repository
        self.workflow = workflow
    
    async def start_batch_analysis(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """배치 분석 시작"""
        try:
            # 1. 배치 분석 작업 생성
            job = BatchAnalysisJob(
                user_id=request_data["user_id"],
                file_name=request_data["file_name"],
                status="pending"
            )
            
            # 2. DB에 작업 저장
            await self.repository.create_job(job)
            
            # 3. 테이블 파싱 및 질문 목록 추출
            parsed_data = await self.workflow.load_survey_tables(
                request_data["file_content"], 
                request_data["file_name"]
            )
            question_keys = parsed_data["question_keys"]
            question_texts = parsed_data.get("question_texts", {})
            
            # 4. 각 질문별로 결과 레코드 생성
            for key in question_keys:
                result = BatchAnalysisResult(
                    job_id=job.id,
                    question_key=key,
                    status="pending"
                )
                # question 필드도 포함
                setattr(result, "question", question_texts.get(key, ""))
                await self.repository.create_result(result)
            
            # 5. 비동기 분석 시작
            asyncio.create_task(self._analyze_questions_async(
                job.id, 
                request_data, 
                question_keys
            ))
            
            return {
                "success": True,
                "job_id": job.id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _analyze_questions_async(self, job_id: str, request_data: Dict[str, Any], question_keys: List[str]):
        """비동기로 모든 질문 분석 수행"""
        try:
            # question_texts를 미리 파싱
            parsed_data = await self.workflow.load_survey_tables(
                request_data["file_content"], 
                request_data["file_name"]
            )
            question_texts = parsed_data.get("question_texts", {})
            for key in question_keys:
                # 이미 완료된 질문은 건너뛰기
                existing_result = await self.repository.get_result(job_id, key)
                if existing_result and existing_result.status == "done":
                    continue
                
                # 상태를 running으로 업데이트
                await self.repository.update_result_status(job_id, key, "running")
                
                try:
                    # 개별 질문 분석 실행
                    # 통계 검정 미사용 시 test_type을 manual로 강제 설정
                    options = {
                        "analysis_type": False,
                        "selected_key": key,
                        "lang": request_data["lang"],
                        "user_id": request_data["user_id"],
                        "use_statistical_test": request_data.get("use_statistical_test", True)
                    }
                    
                    # 통계 검정 미사용 시 test_type을 manual로 설정
                    if not request_data.get("use_statistical_test", True):
                        options["test_type"] = "manual"
                    
                    analysis_result = await self.workflow.execute(
                        file_content=request_data["file_content"],
                        file_name=request_data["file_name"],
                        options=options,
                        raw_data_content=request_data.get("raw_data_content") if request_data.get("use_statistical_test", True) else None,
                        raw_data_filename=request_data.get("raw_data_filename") if request_data.get("use_statistical_test", True) else None
                    )
                    
                    # 결과 저장 (question도 함께)
                    await self.repository.update_result(
                        job_id, 
                        key, 
                        "done", 
                        analysis_result.get("result"),
                        None,
                        question_texts.get(key, "")
                    )
                    
                except Exception as e:
                    # 에러 발생 시 상태 업데이트
                    await self.repository.update_result(
                        job_id, 
                        key, 
                        "error", 
                        None, 
                        str(e),
                        question_texts.get(key, "")
                    )
            
            # 전체 작업 완료 시 상태 업데이트
            await self.repository.update_job_status(job_id, "done")
            
        except Exception as e:
            # 전체 작업 에러 시 상태 업데이트
            await self.repository.update_job_status(job_id, "error")
            print(f"Batch analysis error: {e}")
    
    async def get_batch_status(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 상태 조회"""
        try:
            results = await self.repository.get_results_by_job_id(job_id)
            return {
                "success": True,
                "results": results
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def cancel_batch_analysis(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 취소"""
        try:
            # 작업 상태를 cancelled로 업데이트
            await self.repository.update_job_status(job_id, "cancelled")
            
            # 진행 중인 질문들을 cancelled로 업데이트
            await self.repository.update_pending_results_status(job_id, "cancelled")
            
            # 로그 기록
            log = BatchAnalysisLog(
                job_id=job_id,
                event="cancel",
                timestamp=datetime.utcnow()
            )
            await self.repository.create_log(log)
            
            return {"success": True}
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def restart_batch_analysis(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 재시작"""
        try:
            # 미완료 질문들 조회
            pending_results = await self.repository.get_pending_results(job_id)
            
            if not pending_results:
                return {
                    "success": False,
                    "error": "재시작할 질문이 없습니다."
                }
            
            # 로그 기록
            log = BatchAnalysisLog(
                job_id=job_id,
                event="restart",
                timestamp=datetime.utcnow()
            )
            await self.repository.create_log(log)
            
            return {
                "success": True,
                "message": f"{len(pending_results)}개 질문 재분석을 시작합니다."
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_batch_logs(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 로그 조회"""
        try:
            logs = await self.repository.get_logs_by_job_id(job_id)
            return {
                "success": True,
                "logs": logs
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def download_batch_results(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 결과 다운로드"""
        try:
            results = await self.repository.get_results_by_job_id(job_id)
            return {
                "success": True,
                "data": results
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 