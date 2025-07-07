import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useAuth(redirectTo?: string) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (redirectTo) {
          router.push(`/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
        } else {
          router.push('/auth/signin');
        }
        return;
      }
      
      setUser(user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        if (redirectTo) {
          router.push(`/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
        } else {
          router.push('/auth/signin');
        }
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, redirectTo]);

  return { user, loading };
} 