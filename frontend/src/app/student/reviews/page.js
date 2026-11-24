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
} from 'react-icons/fi';

export default function StudentReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState({});
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews');
      setReviews(res.data || []);
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
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to submit answer');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Reviews & Batch Suggestions</h1>
          <p className="text-sm text-gray-500">
            Review guidelines posted by project coordinator, check milestone action items, acknowledge receipt & submit team answers
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
              reviews.map((r) => (
                <div key={r.id} className="card p-6 space-y-4 hover:border-gray-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-gray-900">Week {r.week_no} Review</span>
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

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Coordinator Guidance & Suggestions
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {r.suggestions}
                    </p>
                  </div>

                  {r.action_items && r.action_items.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Milestone Action Items Checklist
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {r.action_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-start gap-2 text-gray-800"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{item.item}</span>
                              {item.due_date && (
                                <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                                  Due: {item.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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

                  {/* Discussion / Submitted Answers from Students and Guides */}
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary-900 flex items-center gap-1.5">
                        <FiMessageSquare className="w-3.5 h-3.5 text-primary-600" />
                        Responses & Answers to Coordinator Comments ({r.remarks?.length || 0})
                      </h4>
                    </div>

                    {r.remarks && r.remarks.length > 0 ? (
                      <div className="space-y-2">
                        {r.remarks.map((rem) => (
                          <div key={rem.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
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
                                {rem.team_name && <span className="text-gray-400 font-medium">({rem.team_name})</span>}
                              </div>
                              <span className="text-[10px] text-gray-400">{new Date(rem.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-line pl-0.5 leading-relaxed">
                              {rem.remark}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No answers submitted yet. Provide your team&apos;s answer below.</p>
                    )}

                    {/* Answer Submission Box */}
                    <div className="pt-2">
                      <label className="text-[11px] font-bold uppercase text-gray-700 block mb-1">
                        Submit Answer / Feedback to Coordinator:
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <textarea
                          rows={2}
                          placeholder="Provide details on how your team addressed these suggestions or current progress..."
                          value={replyText[r.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                          className="input-field flex-1 text-xs"
                        />
                        <button
                          onClick={() => handleSendAnswer(r.id)}
                          disabled={submittingReply[r.id] || !replyText[r.id]?.trim()}
                          className="btn-primary text-xs inline-flex items-center justify-center gap-1.5 px-4 self-end sm:self-auto disabled:opacity-50"
                        >
                          <FiSend className="w-3.5 h-3.5" />
                          <span>{submittingReply[r.id] ? 'Submitting...' : 'Send Answer'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
