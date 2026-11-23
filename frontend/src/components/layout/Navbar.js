'use client';

import { FiMenu, FiLogOut, FiKey } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/ui/NotificationBell';
import toast from 'react-hot-toast';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (err) {
      toast.error('Logout error');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl lg:hidden transition-colors"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-gray-800 hidden sm:inline-block">
          Welcome, {user?.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <button
          onClick={() => router.push('/change-password')}
          title="Change Password"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <FiKey className="w-4 h-4" />
        </button>

        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
        >
          <FiLogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
