from typing import Dict, Any, Optional
from app.single_analysis.domain.entities import AgentState
from app.single_analysis.domain.services import TableAnalysisService

class TableAnalysisUseCase:
    """테이블 분석 유스케이스"""
    def __init__(self, service: TableAnalysisService):
        self.service = service

    async def execute(self, file_content: bytes, file_name: str, options: Dict[str, Any] = None, raw_data_content: bytes = None, raw_data_filename: str = None, use_statistical_test: bool = True) -> Dict[str, Any]:
        try:
            state = AgentState(
                uploaded_file=file_content,
                file_path=file_name,
                analysis_type=options.get("analysis_type", True) if options else True,
                selected_key=options.get("selected_key", "") if options else "",
                lang=options.get("lang", "한국어") if options else "한국어",
                user_id=options.get("user_id") if options else None,
                raw_data_file=raw_data_content
            )
            # use_statistical_test 설정
            state.use_statistical_test = use_statistical_test
            on_step = options.get("on_step") if options else None

            state = await self.service.parse_table(state, on_step)
            state = await self.service.generate_hypothesis(state, on_step)
            state = await self.service.decide_test_type(state, on_step)
            state = await self.service.run_statistical_analysis(state, on_step)
            state = await self.service.extract_anchor(state, on_step)
            state = await self.service.analyze_table(state, on_step)

            # 환각 검증 및 수정 루프
            max_revisions = 4
            while state.hallucination_reject_num < max_revisions:
                state = await self.service.check_hallucination(state, on_step)
                if state.hallucination_check == "accept":
                    break
                elif state.hallucination_check == "reject":
                    if state.hallucination_reject_num >= 4:
                        if on_step:
                            on_step("⚠️ 거부 횟수 초과, 종료합니다.")
                        break
                    state = await self.service.revise_analysis(state, on_step)
                    state.hallucination_reject_num += 1
                else:
                    raise Exception(f"예상치 못한 결정: {state.hallucination_check}")

            state = await self.service.polish_sentence(state, on_step)

            return {
                "success": True,
                "result": {
                    "polishing_result": state.polishing_result,
                    "table_analysis": state.table_analysis,
                    "ft_test_summary": state.ft_test_summary,
                    "generated_hypotheses": state.generated_hypotheses,
                    "anchor": state.anchor,
                    "revised_analysis_history": state.revised_analysis_history,
                    "test_type": state.test_type,
                    "ft_test_result": state.ft_test_result.to_dict(orient="records") if hasattr(state.ft_test_result, "to_dict") else (state.ft_test_result if isinstance(state.ft_test_result, list) else []),
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 