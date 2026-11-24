'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiCheckCircle,
  FiCalendar,
  FiCheck,
  FiPaperclip,
  FiExternalLink,
  FiEye,
  FiMessageSquare,
  FiSend,
  FiAlertTriangle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';

export default function StudentReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState({});

  // Solution submission state per batch comment
  const [solutionTexts, setSolutionTexts] = useState({});
  const [solutionLinks, setSolutionLinks] = useState({});
  const [submittingSolution, setSubmittingSolution] = useState({});

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews');
      setReviews(res.data || []);

      // Pre-fill existing solutions
      if (res.data) {
        const texts = {};
        const links = {};
        res.data.forEach(r => {
          if (r.batch_comments) {
            r.batch_comments.forEach(bc => {
              if (bc.solution_text) texts[bc.id] = bc.solution_text;
              if (bc.solution_link) links[bc.id] = bc.solution_link;
            });
          }
        });
        setSolutionTexts(texts);
        setSolutionLinks(links);
      }
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      setAcking(prev => ({ ...prev, [id]: true }));
      await api.post(`/reviews/${id}/ack`);
      toast.success('Acknowledged: Marked as Seen');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge');
    } finally {
      setAcking(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmitSolution = async (commentId) => {
    const text = solutionTexts[commentId]?.trim();
    if (!text) {
      toast.error('Please describe the solution or action taken');
      return;
    }

    try {
      setSubmittingSolution(prev => ({ ...prev, [commentId]: true }));
      await api.post(`/reviews/batch-comments/${commentId}/solution`, {
        solution_text: text,
        solution_link: solutionLinks[commentId]?.trim() || null,
      });
      toast.success('Solution submitted successfully for coordinator review!');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to submit solution');
    } finally {
      setSubmittingSolution(prev => ({ ...prev, [commentId]: false }));
    }
  };

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Reviews & Batch Comments</h1>
          <p className="text-sm text-gray-500">
            View review comments given specifically to your batch, inspect milestone guidelines & submit solutions for verification
          </p>
        </div>

        {loading ? (
          <Loading text="Loading weekly reviews..." />
        ) : (
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No weekly reviews published for your batch yet.
              </div>
            ) : (
              reviews.map((r) => {
                const batchComments = r.batch_comments || [];

                return (
                  <div key={r.id} className="card p-6 space-y-5 hover:border-gray-300 transition-all border-2 border-primary-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-gray-900">Week {r.week_no} Review Session</span>
                          <span className="text-xs bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                            {r.batch_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Conducted: {new Date(r.review_date).toLocaleDateString()} • Posted by {r.created_by_name}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAcknowledge(r.id)}
                        disabled={acking[r.id]}
                        className="btn-primary text-xs inline-flex items-center gap-1.5"
                      >
                        <FiCheck className="w-4 h-4" />
                        <span>{acking[r.id] ? 'Marking...' : 'Mark as Seen'}</span>
                      </button>
                    </div>

                    {/* ======================================================== */}
                    {/* COMMENTS GIVEN TO STUDENT'S BATCH & SOLUTION SUBMISSION */}
                    {/* ======================================================== */}
                    {batchComments.length > 0 ? (
                      <div className="space-y-4">
                        {batchComments.map((bc) => (
                          <div
                            key={bc.id}
                            className={`p-5 rounded-2xl border text-xs space-y-3 ${
                              bc.status === 'approved'
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : bc.status === 'submitted'
                                ? 'bg-blue-50/50 border-blue-300'
                                : bc.status === 'needs_revision'
                                ? 'bg-rose-50/50 border-rose-300'
                                : 'bg-amber-50/50 border-amber-300'
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-black text-sm text-gray-900">
                                Comments Given to {bc.team_name}
                              </span>

                              <div>
                                {bc.status === 'approved' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <FiCheck className="w-3.5 h-3.5" /> Solution Approved
                                  </span>
                                )}
                                {bc.status === 'submitted' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                    <FiClock className="w-3.5 h-3.5" /> Solution Submitted
                                  </span>
                                )}
                                {bc.status === 'needs_revision' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                    <FiAlertTriangle className="w-3.5 h-3.5" /> Revisions Requested
                                  </span>
                                )}
                                {bc.status === 'pending' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                    <FiAlertCircle className="w-3.5 h-3.5" /> Solution Required
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Comments Box */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                              <strong className="text-gray-900 font-bold uppercase tracking-wider block text-[11px] text-primary-800">
                                Coordinator Review Comments:
                              </strong>
                              <p className="text-gray-800 whitespace-pre-line text-sm leading-relaxed">
                                {bc.comments}
                              </p>
                            </div>

                            {/* Coordinator Feedback */}
                            {bc.coordinator_feedback && (
                              <div className="bg-rose-100/70 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                                <strong className="font-bold text-[11px] uppercase block">Coordinator Feedback:</strong>
                                <p className="text-xs">{bc.coordinator_feedback}</p>
                              </div>
                            )}

                            {/* Solution Submission Form */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                              <strong className="text-gray-900 font-bold uppercase tracking-wider text-[11px] block">
                                {bc.solution_text ? 'Your Batch Submitted Solution:' : 'Submit Solution for these Comments:'}
                              </strong>

                              <div>
                                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                  Solution Explanation / Action Taken:
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Describe how your batch resolved the comments or requirements..."
                                  value={solutionTexts[bc.id] || ''}
                                  onChange={(e) => setSolutionTexts({ ...solutionTexts, [bc.id]: e.target.value })}
                                  disabled={bc.status === 'approved'}
                                  className="input-field text-xs disabled:bg-gray-50"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                  Solution Work Link (GitHub Repo / PR / Google Drive / Live Demo):
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  value={solutionLinks[bc.id] || ''}
                                  onChange={(e) => setSolutionLinks({ ...solutionLinks, [bc.id]: e.target.value })}
                                  disabled={bc.status === 'approved'}
                                  className="input-field text-xs disabled:bg-gray-50"
                                />
                              </div>

                              {bc.solution_submitted_at && (
                                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                                  <span>Submitted by: <strong>{bc.submitter_name}</strong></span>
                                  <span>{new Date(bc.solution_submitted_at).toLocaleString()}</span>
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
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 italic">
                        No batch-specific comments were recorded for your team in Week {r.week_no}.
                      </div>
                    )}

                    {/* General Suggestions */}
                    {r.suggestions && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs space-y-1">
                        <strong className="text-gray-700 uppercase font-bold text-[10px] block">
                          General Cohort Guidelines:
                        </strong>
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{r.suggestions}</p>
                      </div>
                    )}

                    {r.attachment_link && (
                      <div className="flex items-center gap-2 text-xs">
                        <FiPaperclip className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-500">Resource Attachment:</span>
                        <a
                          href={r.attachment_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          {r.attachment_link}
                          <FiExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
