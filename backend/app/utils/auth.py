from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
import os
from typing import Dict
import requests

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

def get_user_id_from_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No JWT token provided")
    token = auth_header.split(" ")[1]
    
    # Supabase JWT 토큰 검증
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            # Supabase API를 통해 토큰 검증
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            }
            response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                user_id = user_data.get("id")
                if user_id:
                    return user_id
            else:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")
        except Exception as e:
            print(f"Supabase token validation error: {e}")
            # Supabase 검증 실패 시 기존 JWT 검증 시도
            pass
    
    # 기존 JWT 검증 로직 (fallback)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT token")

def get_current_user(request: Request) -> Dict:
    """현재 사용자 정보를 반환하는 함수"""
    user_id = get_user_id_from_token(request)
    return {"id": user_id} 