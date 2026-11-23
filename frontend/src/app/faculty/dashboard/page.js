'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiMessageSquare,
} from 'react-icons/fi';

export default function FacultyDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/faculty');
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
      <AppLayout requiredRole="faculty">
        <Loading text="Loading guide dashboard..." />
      </AppLayout>
    );
  }

  const { teams = [], recentUpdates = [] } = data || {};

  return (
    <AppLayout requiredRole="faculty">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Faculty Guide Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor your assigned student project teams, verify daily logs & provide remarks</p>
        </div>

        {/* Assigned Teams Grid */}
        <div className="space-y-3">
          <h2 className="section-title">My Assigned Project Teams ({teams.length})</h2>
          {teams.length === 0 ? (
            <div className="card text-center py-8 text-sm text-gray-400">
              You are currently not assigned as a guide to any active teams.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => (
                <div
                  key={t.id}
                  onClick={() => router.push(`/faculty/teams/${t.id}`)}
                  className="card p-5 hover:border-primary-300 hover:shadow-md cursor-pointer transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-gray-900">{t.name}</span>
                    <Badge status={t.status} size="sm" />
                  </div>

                  <p className="text-xs text-primary-700 font-semibold line-clamp-1">
                    {t.project_title || 'Untitled Project'}
                  </p>

                  <div className="space-y-1 text-xs text-gray-500">
                    <p>
                      <strong>Team Lead:</strong> {t.lead_roll_number ? `[${t.lead_roll_number}] ` : ''}{t.lead_name || 'Unassigned'}
                    </p>
                    <p><strong>Cohort:</strong> {t.batch_name}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-500">Milestone Progress</span>
                      <span className="text-primary-600">{t.progress_percent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full"
                        style={{ width: `${t.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className={parseInt(t.has_today_update, 10) > 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {parseInt(t.has_today_update, 10) > 0 ? '✓ Submitted today' : '⏳ Pending today'}
                    </span>
                    <span className="text-primary-600 font-bold inline-flex items-center gap-1">
                      View Team &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Updates Feed */}
        <div className="card">
          <h2 className="section-title mb-4">Latest Daily Updates from My Teams</h2>
          {recentUpdates.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No recent updates submitted by your teams.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentUpdates.map((u) => (
                <div key={u.id} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{u.team_name}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      {u.is_late && <Badge status="late" text="Late" size="sm" />}
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                      {u.percent_complete}% Done
                    </span>
                  </div>

                  <p className="text-xs text-gray-700">
                    <strong className="text-gray-900">Done Today:</strong> {u.done_today}
                  </p>

                  {u.blockers && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                      <strong>Blocker:</strong> {u.blockers}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => router.push(`/faculty/teams/${u.team_id}`)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800"
                    >
                      Inspect & Comment &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
