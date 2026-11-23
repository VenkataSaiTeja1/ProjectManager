'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiFileText,
  FiAward,
  FiUsers,
  FiActivity,
  FiCalendar,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/admin');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AppLayout requiredRole="admin">
        <Loading text="Loading live dashboard analytics..." />
      </AppLayout>
    );
  }

  const { cards, charts, teamProgress } = data || {};

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

  const trendData = (charts?.submissionTrend || []).map((t) => ({
    date: new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    Submitted: parseInt(t.submitted || 0, 10),
    Missing: Math.max(0, parseInt(t.not_submitted || 0, 10)),
    Late: parseInt(t.late || 0, 10),
  }));

  const projectStatusData = (charts?.projectDistribution || []).map((p) => ({
    name: p.status.replace(/_/g, ' '),
    value: parseInt(p.count, 10),
  }));

  const paperStatusData = (charts?.paperDistribution || []).map((p) => ({
    name: p.status.replace(/_/g, ' '),
    value: parseInt(p.count, 10),
  }));

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Coordinator Overview</h1>
            <p className="text-sm text-gray-500">Live monitoring metrics for student projects, daily updates & research papers</p>
          </div>
          <button
            onClick={() => router.push('/admin/daily-tracker')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiCalendar className="w-4 h-4" />
            Open Daily Tracker
          </button>
        </div>

        {/* Top Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Updates"
            value={`${cards?.updatesToday ?? 0} / ${cards?.activeTeams ?? 0}`}
            subtitle={`${cards?.lateToday ?? 0} submitted late`}
            icon={FiCheckCircle}
            color="green"
            onClick={() => router.push('/admin/daily-tracker')}
          />
          <StatCard
            title="Missing Today"
            value={cards?.notSubmittedToday ?? 0}
            subtitle="Follow-up recommended"
            icon={FiAlertTriangle}
            color="red"
            onClick={() => router.push('/admin/daily-tracker')}
          />
          <StatCard
            title="Active Teams"
            value={cards?.activeTeams ?? 0}
            subtitle={`${cards?.totalStudents ?? 0} students enrolled`}
            icon={FiUsers}
            color="blue"
            onClick={() => router.push('/admin/teams')}
          />
          <StatCard
            title="Papers Published"
            value={cards?.papersPublished ?? 0}
            subtitle={`${cards?.papersTotal ?? 0} total papers tracked`}
            icon={FiAward}
            color="purple"
            onClick={() => router.push('/admin/papers?status=published')}
          />
        </div>

        {/* Secondary Papers & Project Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Papers Submitted"
            value={cards?.papersSubmitted ?? 0}
            icon={FiFileText}
            color="amber"
            onClick={() => router.push('/admin/papers?status=submitted')}
          />
          <StatCard
            title="Under Review"
            value={cards?.papersUnderReview ?? 0}
            icon={FiClock}
            color="indigo"
            onClick={() => router.push('/admin/papers?status=under_review')}
          />
          <StatCard
            title="Projects Pending"
            value={cards?.pendingReviewTeams ?? 0}
            icon={FiActivity}
            color="amber"
            onClick={() => router.push('/admin/teams?status=pending_review')}
          />
          <StatCard
            title="Completed Projects"
            value={cards?.completedTeams ?? 0}
            icon={FiAward}
            color="green"
            onClick={() => router.push('/admin/teams?status=completed')}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 cols) */}
          <div className="card lg:col-span-2">
            <h3 className="section-title mb-4">Submission Trend (Last 14 Days)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Missing" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Status Pie Chart */}
          <div className="card">
            <h3 className="section-title mb-4">Project Statuses</h3>
            <div className="h-72 w-full flex items-center justify-center">
              {projectStatusData.length === 0 ? (
                <p className="text-xs text-gray-400">No project data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Attention Teams: Teams with longest days since update */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Teams Requiring Attention</h3>
              <p className="text-xs text-gray-400">Sorted by days since last submitted update</p>
            </div>
            <button
              onClick={() => router.push('/admin/daily-tracker')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              View All in Tracker &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-y border-gray-100">
                <tr>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Project Title</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Last Update</th>
                  <th className="py-3 px-4">Days Inactive</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(teamProgress || []).map((t) => {
                  const days = t.days_since_update !== null ? parseInt(t.days_since_update, 10) : 99;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{t.name}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{t.project_title || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${t.progress_percent || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{t.progress_percent || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {t.last_update ? new Date(t.last_update).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            days >= 3
                              ? 'bg-rose-100 text-rose-800'
                              : days >= 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {days === 99 ? 'No updates' : `${days} day${days === 1 ? '' : 's'}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/teams/${t.id}`)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
