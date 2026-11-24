'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiCheckSquare,
  FiCalendar,
  FiMessageSquare,
  FiCheckCircle,
  FiPaperclip,
  FiExternalLink,
  FiSend,
} from 'react-icons/fi';

export default function FacultyReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Remark Modal
  const [remarkModal, setRemarkModal] = useState({ isOpen: false, reviewId: null });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [remarkStatus, setRemarkStatus] = useState('approved');
  const [savingRemark, setSavingRemark] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, tRes] = await Promise.all([
        api.get('/reviews'),
        api.get('/teams'),
      ]);
      setReviews(rRes.data || []);
      setMyTeams(tRes.data || []);
      if (tRes.data?.length > 0 && !selectedTeamId) {
        setSelectedTeamId(tRes.data[0].id.toString());
      }
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRemark = async (e) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    try {
      setSavingRemark(true);
      await api.post('/reviews/remarks', {
        review_id: remarkModal.reviewId,
        team_id: selectedTeamId ? parseInt(selectedTeamId, 10) : null,
        remark: remarkText,
        status: remarkStatus,
      });
      toast.success('Review remarks and answer submitted');
      setRemarkModal({ isOpen: false, reviewId: null });
      setRemarkText('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error saving remark');
    } finally {
      setSavingRemark(false);
    }
  };

  return (
    <AppLayout requiredRole="faculty">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Review Suggestions & Remarks</h1>
          <p className="text-sm text-gray-500">
            Review coordinator guidance for batches, inspect student progress answers & submit faculty feedback per team
          </p>
        </div>

        {loading ? (
          <Loading text="Loading weekly reviews..." />
        ) : (
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="card text-center py-10 text-gray-400 text-sm">
                No weekly reviews available for your batches.
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
                      onClick={() => {
                        setRemarkModal({ isOpen: true, reviewId: r.id });
                        setRemarkText('');
                        setRemarkStatus('approved');
                      }}
                      className="btn-primary text-xs inline-flex items-center gap-1.5"
                    >
                      <FiMessageSquare className="w-3.5 h-3.5" />
                      Add Team Remark / Answer
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
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Action Items</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {r.action_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded border border-gray-100 flex items-start gap-1.5 text-gray-800"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span>{item.item}</span>
                              {item.due_date && (
                                <span className="block text-[10px] text-gray-400 font-mono">
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
                      <a
                        href={r.attachment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Attached Guidelines Link
                        <FiExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Student & Faculty Responses Thread */}
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <FiMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      Submitted Answers & Remarks ({r.remarks?.length || 0})
                    </h4>

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
                      <p className="text-xs text-gray-400 italic">No answers submitted yet by students or faculty.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Guide Remark Modal */}
      <Modal
        isOpen={remarkModal.isOpen}
        onClose={() => setRemarkModal({ isOpen: false, reviewId: null })}
        title="Post Guide Remark on Weekly Review"
      >
        <form onSubmit={handleSaveRemark} className="space-y-4">
          <div>
            <label className="label-text">Select Guided Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="input-field"
            >
              <option value="">General Batch Feedback (No specific team)</option>
              {myTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.project_title || 'Untitled'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Review Status for Team</label>
            <select
              value={remarkStatus}
              onChange={(e) => setRemarkStatus(e.target.value)}
              className="input-field"
            >
              <option value="approved">Approved (Milestone Met)</option>
              <option value="needs_work">Needs Work / Revisions Required</option>
              <option value="pending">Pending Further Demo</option>
            </select>
          </div>

          <div>
            <label className="label-text">Guide Remarks & Answers</label>
            <textarea
              required
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="e.g. Reviewed progress with team. UI design approved, but database schema needs normalization."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRemarkModal({ isOpen: false, reviewId: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingRemark} className="btn-primary text-xs">
              {savingRemark ? 'Saving...' : 'Submit Remark'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
