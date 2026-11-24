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
  FiCheck,
  FiAlertTriangle,
} from 'react-icons/fi';

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Solution submission form state per batch comment
  const [solutionTexts, setSolutionTexts] = useState({});
  const [solutionLinks, setSolutionLinks] = useState({});
  const [submittingSolution, setSubmittingSolution] = useState({});

  // General discussion reply
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/student');
      setData(res.data);

      // Pre-fill existing solutions if present
      if (res.data?.teamBatchComments) {
        const texts = {};
        const links = {};
        res.data.teamBatchComments.forEach(bc => {
          if (bc.solution_text) texts[bc.id] = bc.solution_text;
          if (bc.solution_link) links[bc.id] = bc.solution_link;
        });
        setSolutionTexts(texts);
        setSolutionLinks(links);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSubmitSolution = async (commentId) => {
    const text = solutionTexts[commentId]?.trim();
    if (!text) {
      toast.error('Please describe the solution or action taken for the comments');
      return;
    }

    try {
      setSubmittingSolution(prev => ({ ...prev, [commentId]: true }));
      await api.post(`/reviews/batch-comments/${commentId}/solution`, {
        solution_text: text,
        solution_link: solutionLinks[commentId]?.trim() || null,
      });
      toast.success('Solution submitted successfully! Coordinator has been notified.');
      fetchDashboard();
    } catch (err) {
      toast.error(err.message || 'Failed to submit solution');
    } finally {
      setSubmittingSolution(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleSendAnswer = async (reviewId) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;

    try {
      setSubmittingReply(prev => ({ ...prev, [reviewId]: true }));
      await api.post('/reviews/remarks', {
        review_id: reviewId,
        remark: text,
      });
      toast.success('Your answer to coordinator suggestions was submitted');
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
    teamBatchComments = [],
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
                  Your account is registered in your cohort. Team allocations are being finalized by the coordinator. Check weekly review suggestions and guidance below.
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

        {/* ========================================================================= */}
        {/* WEEKLY REVIEW COMMENTS SPECIFICALLY FOR THIS BATCH & SOLUTION SUBMISSION */}
        {/* ========================================================================= */}
        {team && teamBatchComments.length > 0 && (
          <div className="card space-y-4 border-2 border-primary-500 bg-gradient-to-b from-white to-primary-50/20">
            <div className="flex items-center justify-between border-b border-primary-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary-600 text-white rounded-lg">
                    <FiZap className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-black text-gray-900">
                    Weekly Review Comments for {team.name} — Solution Submission Required
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Coordinator comments given specifically to your batch. You and your faculty guide must submit solutions for them.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {teamBatchComments.map((bc) => (
                <div
                  key={bc.id}
                  className={`p-5 rounded-2xl border text-xs space-y-4 ${
                    bc.status === 'approved'
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : bc.status === 'submitted'
                      ? 'bg-blue-50/40 border-blue-300'
                      : bc.status === 'needs_revision'
                      ? 'bg-rose-50/40 border-rose-300'
                      : 'bg-amber-50/40 border-amber-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">Week {bc.week_no} Comments</span>
                      <span className="text-[10px] text-gray-500">
                        Given on {new Date(bc.review_date).toLocaleDateString()} by {bc.created_by_name}
                      </span>
                    </div>

                    <div>
                      {bc.status === 'approved' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <FiCheck className="w-3.5 h-3.5" /> Solution Approved
                        </span>
                      )}
                      {bc.status === 'submitted' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                          <FiClock className="w-3.5 h-3.5" /> Solution Submitted (Awaiting Review)
                        </span>
                      )}
                      {bc.status === 'needs_revision' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                          <FiAlertTriangle className="w-3.5 h-3.5" /> Revisions Requested
                        </span>
                      )}
                      {bc.status === 'pending' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <FiAlertCircle className="w-3.5 h-3.5" /> Pending Solution Submission
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Coordinator's Comments Box */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                    <strong className="text-gray-900 font-bold uppercase tracking-wider block text-[11px] text-primary-800">
                      Coordinator Comments & Instructions for {team.name}:
                    </strong>
                    <p className="text-gray-800 whitespace-pre-line leading-relaxed text-sm font-medium">
                      {bc.comments}
                    </p>
                  </div>

                  {/* Coordinator Feedback Note if Revisions requested */}
                  {bc.coordinator_feedback && (
                    <div className="bg-rose-100/70 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                      <strong className="font-bold text-[11px] uppercase block">Coordinator Feedback:</strong>
                      <p className="text-xs">{bc.coordinator_feedback}</p>
                    </div>
                  )}

                  {/* Solution Submission / View Form */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                    <strong className="text-gray-900 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FiCheckCircle className="w-4 h-4 text-primary-600" />
                      {bc.solution_text ? 'Submitted Solution & Resolution Work' : 'Submit Solution for these Comments'}
                    </strong>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        Solution Description / Actions Completed:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detail how your batch addressed these comments (e.g. Implemented the requested modules, fixed relations, conducted testing)..."
                        value={solutionTexts[bc.id] || ''}
                        onChange={(e) => setSolutionTexts({ ...solutionTexts, [bc.id]: e.target.value })}
                        disabled={bc.status === 'approved'}
                        className="input-field text-xs disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        Solution Verification Link (GitHub PR, Google Drive, Live Demo, or Docs):
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        value={solutionLinks[bc.id] || ''}
                        onChange={(e) => setSolutionLinks({ ...solutionLinks, [bc.id]: e.target.value })}
                        disabled={bc.status === 'approved'}
                        className="input-field text-xs disabled:bg-gray-50"
                      />
                    </div>

                    {bc.solution_submitted_at && (
                      <div className="text-[11px] text-gray-400 flex items-center justify-between">
                        <span>Submitted by: <strong>{bc.submitter_name}</strong></span>
                        <span>Date: {new Date(bc.solution_submitted_at).toLocaleString()}</span>
                      </div>
                    )}

                    {bc.status !== 'approved' && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleSubmitSolution(bc.id)}
                          disabled={submittingSolution[bc.id] || !solutionTexts[bc.id]?.trim()}
                          className="btn-primary text-xs inline-flex items-center gap-1.5 px-4"
                        >
                          <FiSend className="w-3.5 h-3.5" />
                          <span>{submittingSolution[bc.id] ? 'Submitting...' : bc.solution_text ? 'Update Solution' : 'Submit Solution'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cohort-Wide Weekly Reviews Guidance */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary-100 text-primary-700 rounded-lg">
                  <FiCalendar className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-gray-900">
                  Weekly Review Sessions & Cohort Guidance
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                General milestone guidelines and review records for your batch cohort
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
              No weekly review sessions recorded yet for your cohort.
            </p>
          ) : (
            <div className="space-y-4">
              {weeklyReviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-sm text-gray-900">Week {r.week_no} General Guidelines</span>
                    <span className="text-xs text-gray-400">
                      Date: {new Date(r.review_date).toLocaleDateString()} • Posted by {r.created_by_name}
                    </span>
                  </div>

                  {r.suggestions && (
                    <p className="text-gray-700 whitespace-pre-line text-xs bg-white p-3 rounded-lg border border-gray-100">
                      {r.suggestions}
                    </p>
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
                        Guidelines Reference Link <FiExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
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
