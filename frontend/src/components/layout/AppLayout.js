'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Loading from '../ui/Loading';

export default function AppLayout({ children, requiredRole = null }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.must_change_password && pathname !== '/change-password') {
        router.push('/change-password');
      } else if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        // Redirect to user's home dashboard if accessing unauthorized route
        if (user.role === 'faculty') router.push('/faculty/dashboard');
        else if (user.role === 'student') router.push('/student/dashboard');
      }
    }
  }, [user, loading, router, pathname, requiredRole]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <Loading text="Authenticating session..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar user={user} />
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
