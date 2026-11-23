'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLock, FiCheck } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password changed successfully');
      await refreshUser();

      if (user?.role === 'admin') router.push('/admin/dashboard');
      else if (user?.role === 'faculty') router.push('/faculty/dashboard');
      else router.push('/student/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/60 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <FiLock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            {user?.must_change_password ? 'Password Update Required' : 'Change Your Password'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {user?.must_change_password
              ? 'For security, you must set a new personal password on your first login.'
              : 'Choose a strong password containing letters, numbers, and symbols.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Current / Temporary Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
          >
            <FiCheck className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Set New Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
