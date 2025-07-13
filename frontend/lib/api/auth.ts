// lib/api/auth.ts
import { getSession } from 'next-auth/react';

export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await getSession();
    // @ts-ignore - session에 accessToken이 있을 수 있음
    return session?.accessToken || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
} 