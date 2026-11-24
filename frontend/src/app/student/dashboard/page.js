'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
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
  FiPaperclip,
  FiExternalLink,
  FiSend,
} from 'react-icons/fi';

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
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

  const handleSendAnswer = async (reviewId) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;

    try {
      setSubmittingReply(prev => ({ ...prev, [reviewId]: true }));
      await api.post('/reviews/remarks', {
        review_id: reviewId,
        remark: text,
      });
      toast.success('Your answer to coordinator suggestions was submitted successfully');
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
      <AppLayout requiredRole="student">
        <Loading text="Loading your project dashboard..." />
      </AppLayout>
    );
  }

  const {
    team,
    isLead,
    todayUpdate,
    recentUpdates = [],
    announcements = [],
    papers = [],
    weeklyReviews = [],
  } = data || {};

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        {/* Welcome Banner */}
        {team ? (
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
        ) : (
          <div className="card bg-gradient-to-r from-amber-600 to-orange-700 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <FiUsers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome to Student Project Portal</h1>
                <p className="text-xs text-amber-100 mt-0.5">
                  Your account is registered in your cohort. Team allocations are being organized by the coordinator. Check weekly review suggestions and guidance below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Submission Status Card (if team assigned) */}
        {team && (
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
        )}

        {/* Weekly Review Suggestions & Answers (Key Requirement) */}
        <div className="card space-y-4 border-2 border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary-100 text-primary-700 rounded-lg">
                  <FiZap className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-gray-900">
                  Weekly Review Suggestions from Project Coordinator
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Weekly reviews conducted for your batch. Read guidance and submit your team&apos;s answer / progress reply.
              </p>
            </div>

            <button
              onClick={() => router.push('/student/reviews')}
              className="text-xs font-bold text-primary-700 hover:underline flex items-center gap-1"
            >
              All Weekly Reviews <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {weeklyReviews.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">
              No weekly review suggestions published for your batch yet.
            </p>
          ) : (
            <div className="space-y-4">
              {weeklyReviews.map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">Week {r.week_no} Review</span>
                      <span className="text-[10px] bg-primary-100 text-primary-800 font-bold px-2 py-0.5 rounded-full">
                        {r.batch_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      Date: {new Date(r.review_date).toLocaleDateString()} • By {r.created_by_name}
                    </span>
                  </div>

                  {/* Suggestions box */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs space-y-1.5">
                    <strong className="text-gray-900 font-bold uppercase tracking-wider block text-[11px] text-primary-800">
                      Coordinator Guidance & Suggestions:
                    </strong>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">
                      {r.suggestions}
                    </p>
                  </div>

                  {/* Action items if any */}
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
                        Guidelines Link <FiExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Existing Answers / Comments */}
                  {r.remarks && r.remarks.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                        Discussion & Submitted Answers:
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

                  {/* Quick Answer Input Box */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold uppercase text-gray-600 block mb-1">
                      Provide Answer / Progress Response to Coordinator:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your answer, action taken or query regarding this week's suggestions..."
                        value={replyText[r.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendAnswer(r.id);
                          }
                        }}
                        className="input-field flex-1 text-xs py-2 bg-white"
                      />
                      <button
                        onClick={() => handleSendAnswer(r.id)}
                        disabled={submittingReply[r.id] || !replyText[r.id]?.trim()}
                        className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 disabled:opacity-50"
                      >
                        <FiSend className="w-3.5 h-3.5" />
                        <span>{submittingReply[r.id] ? 'Sending...' : 'Submit Answer'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
        {papers.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <div>
                <h3 className="section-title">Team Research Paper Tracking</h3>
                <p className="text-xs text-gray-400">Maintained and updated by your faculty guide & project coordinator</p>
              </div>
              <FiFileText className="w-5 h-5 text-gray-400" />
            </div>

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
          </div>
        )}
      </div>
    </AppLayout>
  );
}
