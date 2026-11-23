'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  FiCheckCircle,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiUsers,
  FiFileText,
  FiMessageSquare,
  FiArrowRight,
  FiZap,
} from 'react-icons/fi';

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/student');
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
      <AppLayout requiredRole="student">
        <Loading text="Loading your project dashboard..." />
      </AppLayout>
    );
  }

  const { team, isLead, todayUpdate, recentUpdates = [], announcements = [], papers = [] } = data || {};

  if (!team) {
    return (
      <AppLayout requiredRole="student">
        <div className="card text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <FiUsers className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">No Team Assigned Yet</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            You are enrolled but not yet assigned to an active project team. Please contact your Project Coordinator.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="card bg-gradient-to-r from-primary-600 to-indigo-700 text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-200 block">
                {team.batch_name} • {team.name}
              </span>
              <h1 className="text-2xl font-black mt-1 tracking-tight">
                {team.project_title || 'Untitled Capstone Project'}
              </h1>
              <p className="text-xs text-primary-100 mt-2">
                Faculty Guide: <strong>{team.guide_name || 'Unassigned'}</strong> • Team Lead: <strong>{team.lead_name}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLead && (
                <button
                  onClick={() => router.push('/student/daily-update')}
                  className="px-5 py-2.5 bg-white text-primary-700 font-bold rounded-xl text-xs shadow-lg hover:bg-primary-50 transition-all flex items-center gap-2"
                >
                  <FiCalendar className="w-4 h-4" />
                  {todayUpdate ? 'Edit Today\'s Status' : 'Submit Today\'s Update'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Daily Submission Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card md:col-span-2 flex items-center justify-between p-5 border-l-4 border-l-primary-600">
            <div>
              <span className="text-xs font-bold uppercase text-gray-400 block">Today&apos;s Daily Update</span>
              {todayUpdate ? (
                <div className="mt-1">
                  <span className="text-emerald-700 font-bold text-sm flex items-center gap-1.5">
                    <FiCheckCircle className="w-4 h-4" />
                    Submitted Successfully
                    {todayUpdate.is_late && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold ml-1">
                        Late
                      </span>
                    )}
                  </span>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    Done: {todayUpdate.done_today}
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-rose-600 font-bold text-sm flex items-center gap-1.5">
                    <FiAlertCircle className="w-4 h-4" />
                    Pending Submission for Today
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isLead
                      ? 'As Team Lead, submit before 8:00 PM cutoff to avoid a Late flag.'
                      : 'Awaiting team lead to log today\'s progress.'}
                  </p>
                </div>
              )}
            </div>

            {isLead && !todayUpdate && (
              <button
                onClick={() => router.push('/student/daily-update')}
                className="btn-primary text-xs"
              >
                Submit Now
              </button>
            )}
          </div>

          <div className="card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-gray-400 block">Milestone Progress</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{team.progress_percent || 0}%</p>
              <Badge status={team.status} size="sm" />
            </div>
            <div className="p-3 rounded-2xl bg-primary-50 text-primary-600">
              <FiCheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Recent Updates & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Daily Updates */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="section-title">Recent Status Submissions</h3>
              <button
                onClick={() => router.push('/student/daily-update')}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                View History
              </button>
            </div>

            {recentUpdates.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No previous updates recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {recentUpdates.map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      <span className="font-bold text-primary-700">{u.percent_complete}% Done</span>
                    </div>
                    <p className="text-gray-600 line-clamp-2">{u.done_today}</p>
                    {u.blockers && (
                      <p className="text-rose-600 font-medium">Blocker: {u.blockers}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="section-title">Coordinator Announcements</h3>
              <button
                onClick={() => router.push('/student/announcements')}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                View All
              </button>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No announcements at this time.</p>
            ) : (
              <div className="space-y-2.5">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs space-y-1">
                    <span className="font-bold text-gray-900 block">{a.title}</span>
                    <p className="text-gray-600 line-clamp-2">{a.message}</p>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Research Paper Status (Read-only for Students) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <div>
              <h3 className="section-title">Team Research Paper Tracking</h3>
              <p className="text-xs text-gray-400">Maintained and updated by your faculty guide & project coordinator</p>
            </div>
            <FiFileText className="w-5 h-5 text-gray-400" />
          </div>

          {papers.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No research paper status recorded yet for this team.
            </p>
          ) : (
            <div className="space-y-3">
              {papers.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{p.title}</span>
                    <Badge status={p.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-600">
                    <div><strong>Venue:</strong> {p.venue_or_journal || 'TBD'}</div>
                    <div><strong>Submission ID:</strong> {p.submission_id || 'N/A'}</div>
                    <div><strong>Plagiarism:</strong> {p.plagiarism_percent ? `${p.plagiarism_percent}%` : 'Pending Check'}</div>
                  </div>
                  {p.notes && (
                    <p className="text-gray-600 bg-white p-2 rounded border border-gray-100">
                      <strong>Notes:</strong> {p.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
