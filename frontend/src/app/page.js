'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/ui/Loading';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.must_change_password) {
        router.push('/change-password');
      } else {
        if (user.role === 'admin') router.push('/admin/dashboard');
        else if (user.role === 'faculty') router.push('/faculty/dashboard');
        else router.push('/student/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <Loading text="Redirecting to your dashboard..." />
    </div>
  );
}
