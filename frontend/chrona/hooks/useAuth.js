'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('chrona_token');
    const userId = localStorage.getItem('chrona_user_id');
    const username = localStorage.getItem('chrona_username');

    if (!token || !userId) {
      setLoading(false);
      router.push('/login');
      return;
    }

    // Verify token is still valid
    api.get('/api/auth/me')
      .then((data) => {
        setUser({ userId: data.user_id, username: data.username, profile: data.profile });
        setLoading(false);
      })
      .catch(() => {
        // Token expired — already handled by api.js redirect
        setUser(null);
        setLoading(false);
      });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('chrona_token');
    localStorage.removeItem('chrona_user_id');
    localStorage.removeItem('chrona_username');
    localStorage.removeItem('chrona_onboarded');
    router.push('/login');
  };

  return { user, loading, logout };
}
