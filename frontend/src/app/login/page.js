'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiUser, FiLock, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter your Roll Number / User ID and password');
      return;
    }

    try {
      setLoading(true);
      const res = await login(identifier, password);
      toast.success('Welcome back!');

      if (res.mustChangePassword) {
        // AppLayout will also display the required password update popup
        router.push('/change-password');
      } else {
        const role = res.user.role;
        if (role === 'admin') router.push('/admin/dashboard');
        else if (role === 'faculty') router.push('/faculty/dashboard');
        else router.push('/student/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid Roll Number / User ID or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
            PM
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Monitoring Portal</h1>
          <p className="text-xs text-gray-500 mt-1">Sign in with your Roll Number or Faculty ID</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Roll Number / User ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FiUser className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 231FA04001 or admin"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FiLock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Default password: <strong>Student@123</strong> (students) or <strong>Faculty@123</strong> (faculty).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Forgot password? Contact your Project Coordinator or Faculty Guide.
          </p>
        </div>
      </div>
    </div>
  );
}
