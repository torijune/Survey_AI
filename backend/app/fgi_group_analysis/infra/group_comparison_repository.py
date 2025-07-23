from typing import List, Optional, Dict, Any
from ..domain.entities import GroupComparisonDB, GroupComparisonTopicDB, GroupComparisonWithTopics
from .supabase_client import get_supabase
import uuid

class GroupComparisonRepository:
    """FGI 그룹 비교 분석 결과 저장소"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def save_group_comparison(self, user_id: str, guide_file_name: str, group_names: List[str], 
                                  summary: str, recommendations: str, topic_comparisons: Dict[str, Dict[str, str]]) -> str:
        """그룹 비교 분석 결과를 저장합니다."""
        try:
            # 메인 비교 분석 결과 저장
            comparison_data = {
                'user_id': user_id,
                'guide_file_name': guide_file_name,
                'group_names': group_names,
                'summary': summary,
                'recommendations': recommendations,
                'total_topics': len(topic_comparisons),
                'analysis_status': 'completed'
            }
            
            response = self.supabase.table('fgi_group_comparisons').insert(comparison_data).execute()
            
            if not response.data:
                raise Exception("Failed to save group comparison")
            
            comparison_id = response.data[0]['id']
            
            # 주제별 분석 결과 저장
            topic_data_list = []
            for i, (topic_name, comparison) in enumerate(topic_comparisons.items()):
                topic_data = {
                    'comparison_id': comparison_id,
                    'topic_name': topic_name,
                    'topic_order': i + 1,
                    'common_points': comparison.get('common_points'),
                    'differences': comparison.get('differences'),
                    'insights': comparison.get('insights')
                }
                topic_data_list.append(topic_data)
            
            if topic_data_list:
                self.supabase.table('fgi_group_comparison_topics').insert(topic_data_list).execute()
            
            return comparison_id
            
        except Exception as e:
            print(f"Error saving group comparison: {e}")
            raise e
    
    async def get_user_group_comparisons(self, user_id: str) -> List[GroupComparisonDB]:
        """사용자의 그룹 비교 분석 목록을 조회합니다."""
        try:
            response = self.supabase.table('fgi_group_comparisons').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            if response.data:
                return [GroupComparisonDB(**item) for item in response.data]
            return []
            
        except Exception as e:
            print(f"Error fetching user group comparisons: {e}")
            return []
    
    async def get_group_comparison_with_topics(self, comparison_id: str) -> Optional[GroupComparisonWithTopics]:
        """특정 그룹 비교 분석 결과와 주제별 분석을 함께 조회합니다."""
        try:
            # 메인 비교 분석 조회
            comparison_response = self.supabase.table('fgi_group_comparisons').select('*').eq('id', comparison_id).execute()
            
            if not comparison_response.data:
                return None
            
            comparison = GroupComparisonDB(**comparison_response.data[0])
            
            # 주제별 분석 조회
            topics_response = self.supabase.table('fgi_group_comparison_topics').select('*').eq('comparison_id', comparison_id).order('topic_order').execute()
            
            topics = []
            if topics_response.data:
                topics = [GroupComparisonTopicDB(**item) for item in topics_response.data]
            
            return GroupComparisonWithTopics(comparison=comparison, topics=topics)
            
        except Exception as e:
            print(f"Error fetching group comparison with topics: {e}")
            return None
    
    async def delete_group_comparison(self, comparison_id: str, user_id: str) -> bool:
        """그룹 비교 분석 결과를 삭제합니다."""
        try:
            # 사용자 확인 후 삭제
            response = self.supabase.table('fgi_group_comparisons').delete().eq('id', comparison_id).eq('user_id', user_id).execute()
            return len(response.data) > 0
            
        except Exception as e:
            print(f"Error deleting group comparison: {e}")
            return False

    async def update_group_comparison_metadata(self, comparison_id: str, user_id: str, title: str, description: str) -> bool:
        """그룹 비교 분석의 제목과 설명을 업데이트합니다."""
        try:
            # 사용자 확인 후 업데이트
            response = self.supabase.table('fgi_group_comparisons').update({
                'title': title,
                'description': description,
                'updated_at': 'now()'
            }).eq('id', comparison_id).eq('user_id', user_id).execute()
            
            return len(response.data) > 0
            
        except Exception as e:
            print(f"Error updating group comparison metadata: {e}")
            return False 