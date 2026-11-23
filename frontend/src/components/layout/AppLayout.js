'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Loading from '../ui/Loading';
import Modal from '../ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLock, FiCheck } from 'react-icons/fi';

export default function AppLayout({ children, requiredRole = null }) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // First-login password change modal popup state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        if (user.role === 'faculty') router.push('/faculty/dashboard');
        else if (user.role === 'student') router.push('/student/dashboard');
      }
    }
  }, [user, loading, router, pathname, requiredRole]);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setUpdatingPassword(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password changed successfully! Welcome to your dashboard.');
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <Loading text="Authenticating session..." />
      </div>
    );
  }

  const showPasswordPopup = Boolean(user?.must_change_password && pathname !== '/login');

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

      {/* Mandatory First-Login Password Change Modal Popup */}
      <Modal
        isOpen={showPasswordPopup}
        onClose={() => {}} // User cannot close without setting a new password
        title="Action Required: Set Your Personal Password"
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <FiLock className="w-4 h-4 text-amber-600" />
              Default College Password Detected
            </p>
            <p>
              You are currently using the default college password (<strong>{user?.role === 'student' ? 'Student@123' : 'Faculty@123'}</strong>). For your security, you must choose a new personal password before accessing the portal.
            </p>
          </div>

          <div>
            <label className="label-text">Current Default Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="e.g. Student@123 or Faculty@123"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">New Personal Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new personal password"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="w-full btn-primary py-2.5 inline-flex items-center justify-center gap-2 mt-2"
          >
            <FiCheck className="w-4 h-4" />
            <span>{updatingPassword ? 'Saving Password...' : 'Save Password & Continue'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
