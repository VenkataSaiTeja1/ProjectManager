'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiMessageSquare,
  FiZap,
  FiPaperclip,
  FiExternalLink,
  FiSend,
} from 'react-icons/fi';

export default function FacultyDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
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

  const handleSendReply = async (reviewId) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;

    try {
      setSubmittingReply(prev => ({ ...prev, [reviewId]: true }));
      await api.post('/reviews/remarks', {
        review_id: reviewId,
        remark: text,
        status: 'approved',
      });
      toast.success('Your remarks / answer submitted successfully');
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      fetchDashboard();
    } catch (err) {
      toast.error(err.message || 'Failed to submit answer');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  if (loading) {
    return (
      <AppLayout requiredRole="faculty">
        <Loading text="Loading guide dashboard..." />
      </AppLayout>
    );
  }

  const { teams = [], recentUpdates = [], weeklyReviews = [] } = data || {};

  return (
    <AppLayout requiredRole="faculty">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Faculty Guide Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor your assigned student project teams, verify weekly coordinator review suggestions & answer comments</p>
        </div>

        {/* Weekly Review Suggestions from Coordinator (Key Feature) */}
        <div className="card space-y-4 border-2 border-indigo-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <FiZap className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-gray-900">
                  Weekly Review Suggestions from Project Coordinator
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Coordinator guidance given for batches. Review suggestions, check student answers & provide faculty remarks.
              </p>
            </div>

            <button
              onClick={() => router.push('/faculty/reviews')}
              className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              All Batch Reviews <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {weeklyReviews.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">
              No weekly reviews posted for your batches yet.
            </p>
          ) : (
            <div className="space-y-4">
              {weeklyReviews.map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">Week {r.week_no} Review</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {r.batch_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      Date: {new Date(r.review_date).toLocaleDateString()} • By {r.created_by_name}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs space-y-1.5">
                    <strong className="text-gray-900 font-bold uppercase tracking-wider block text-[11px] text-indigo-800">
                      Coordinator Guidance & Suggestions:
                    </strong>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">
                      {r.suggestions}
                    </p>
                  </div>

                  {r.action_items && r.action_items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {r.action_items.map((act, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-start gap-2">
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-gray-800">{act.item}</span>
                            {act.due_date && <span className="text-[10px] text-gray-400 block font-mono">Due: {act.due_date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {r.attachment_link && (
                    <div className="flex items-center gap-2 text-xs">
                      <FiPaperclip className="w-3.5 h-3.5 text-gray-400" />
                      <a
                        href={r.attachment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Guidelines Reference <FiExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Existing answers / remarks */}
                  {r.remarks && r.remarks.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                        Student Answers & Faculty Feedback:
                      </span>
                      {r.remarks.map((rem) => (
                        <div key={rem.id} className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{rem.user_name}</span>
                              {rem.user_roll_number && (
                                <span className="font-mono text-gray-500 font-semibold">[{rem.user_roll_number}]</span>
                              )}
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                rem.user_role === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {rem.user_role}
                              </span>
                              {rem.team_name && <span className="text-gray-400">({rem.team_name})</span>}
                            </div>
                            <span className="text-[10px] text-gray-400">{new Date(rem.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line pl-0.5">{rem.remark}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Guide Response Box */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">
                      Provide Guide Answer / Response to Coordinator:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Provide faculty guide remarks or answers regarding this week's review suggestions..."
                        value={replyText[r.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendReply(r.id);
                          }
                        }}
                        className="input-field flex-1 text-xs py-2 bg-white"
                      />
                      <button
                        onClick={() => handleSendReply(r.id)}
                        disabled={submittingReply[r.id] || !replyText[r.id]?.trim()}
                        className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 disabled:opacity-50"
                      >
                        <FiSend className="w-3.5 h-3.5" />
                        <span>{submittingReply[r.id] ? 'Submitting...' : 'Post Reply'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Teams Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">My Assigned Project Teams ({teams.length})</h2>
          </div>
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
                    {t.project_title || <span className="text-amber-600 italic">No project title set (Click to set)</span>}
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
                      Manage Team &rarr;
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
