import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되어 있지 않습니다.")
    return create_client(SUPABASE_URL, SUPABASE_KEY) 