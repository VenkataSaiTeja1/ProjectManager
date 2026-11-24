'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiEye,
  FiEdit2,
  FiCheckCircle,
  FiCalendar,
  FiFileText,
  FiPaperclip,
  FiExternalLink,
  FiUsers,
  FiTrash2,
  FiMessageSquare,
  FiCheck,
  FiAlertTriangle,
  FiSend,
} from 'react-icons/fi';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');

  // Post / Edit Review Modal
  const [reviewModal, setReviewModal] = useState({ isOpen: false, isEditing: false, reviewId: null });
  const [formData, setFormData] = useState({
    batch_id: '',
    week_no: 1,
    review_date: new Date().toISOString().split('T')[0],
    suggestions: '',
    action_items: [{ item: '', due_date: '' }],
    attachment_link: '',
  });
  const [saving, setSaving] = useState(false);

  // Give Comments to Batch Modal
  const [batchCommentModal, setBatchCommentModal] = useState({
    isOpen: false,
    reviewId: null,
    teamId: '',
    comments: '',
    action_items: [{ item: '', due_date: '' }],
    saving: false,
  });

  // Review Submitted Solution Modal
  const [solutionModal, setSolutionModal] = useState({
    isOpen: false,
    batchComment: null,
    coordinatorFeedback: '',
    saving: false,
  });

  // Seen & Responses Modal
  const [seenModal, setSeenModal] = useState({ isOpen: false, review: null, details: null, loading: false });

  const fetchBatchesAndTeams = async () => {
    try {
      const [bRes, tRes] = await Promise.all([
        api.get('/batches'),
        api.get('/teams', { limit: 100 }),
      ]);
      setBatches(bRes.data || []);
      setTeams(tRes.data || []);
      if (bRes.data?.length > 0 && !selectedBatch) {
        setSelectedBatch(bRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews', { batch_id: selectedBatch || undefined });
      setReviews(res.data || []);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchesAndTeams();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [selectedBatch]);

  const handleAddActionItem = () => {
    setFormData({
      ...formData,
      action_items: [...formData.action_items, { item: '', due_date: '' }],
    });
  };

  const handleRemoveActionItem = (index) => {
    setFormData({
      ...formData,
      action_items: formData.action_items.filter((_, i) => i !== index),
    });
  };

  const handleActionItemChange = (index, field, value) => {
    const updated = [...formData.action_items];
    updated[index][field] = value;
    setFormData({ ...formData, action_items: updated });
  };

  const openCreateModal = () => {
    setReviewModal({ isOpen: true, isEditing: false, reviewId: null });
    setFormData({
      batch_id: selectedBatch || batches[0]?.id || '',
      week_no: (reviews.length + 1) || 1,
      review_date: new Date().toISOString().split('T')[0],
      suggestions: '',
      action_items: [{ item: '', due_date: '' }],
      attachment_link: '',
    });
  };

  const openEditReview = (r) => {
    setReviewModal({ isOpen: true, isEditing: true, reviewId: r.id });
    setFormData({
      batch_id: r.batch_id || '',
      week_no: r.week_no || 1,
      review_date: r.review_date ? r.review_date.split('T')[0] : new Date().toISOString().split('T')[0],
      suggestions: r.suggestions || '',
      action_items: Array.isArray(r.action_items) && r.action_items.length > 0
        ? r.action_items
        : [{ item: '', due_date: '' }],
      attachment_link: r.attachment_link || '',
    });
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        batch_id: parseInt(formData.batch_id, 10),
        week_no: parseInt(formData.week_no, 10),
        review_date: formData.review_date,
        suggestions: formData.suggestions,
        action_items: formData.action_items.filter(a => a.item && a.item.trim() !== ''),
        attachment_link: formData.attachment_link || null,
      };

      if (reviewModal.isEditing) {
        await api.put(`/reviews/${reviewModal.reviewId}`, payload);
        toast.success('Weekly review suggestions updated');
      } else {
        await api.post('/reviews', payload);
        toast.success('Weekly review suggestions posted to batch');
      }
      setReviewModal({ isOpen: false, isEditing: false, reviewId: null });
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Error saving review');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this weekly review?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  // Open Give Comments to Batch Modal
  const openGiveBatchCommentModal = (reviewId, teamId = '', existingComments = '') => {
    setBatchCommentModal({
      isOpen: true,
      reviewId,
      teamId: teamId ? teamId.toString() : (teams[0]?.id ? teams[0].id.toString() : ''),
      comments: existingComments || '',
      action_items: [{ item: '', due_date: '' }],
      saving: false,
    });
  };

  const handleSaveBatchComment = async (e) => {
    e.preventDefault();
    if (!batchCommentModal.teamId || !batchCommentModal.comments.trim()) {
      toast.error('Please select a batch and enter comments');
      return;
    }

    try {
      setBatchCommentModal(prev => ({ ...prev, saving: true }));
      await api.post(`/reviews/${batchCommentModal.reviewId}/batch-comments`, {
        team_id: parseInt(batchCommentModal.teamId, 10),
        comments: batchCommentModal.comments.trim(),
        action_items: batchCommentModal.action_items.filter(a => a.item && a.item.trim() !== ''),
      });
      toast.success('Comments saved and notified to that batch & faculty guide');
      setBatchCommentModal({ isOpen: false, reviewId: null, teamId: '', comments: '', action_items: [], saving: false });
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to save batch comments');
    } finally {
      setBatchCommentModal(prev => ({ ...prev, saving: false }));
    }
  };

  // Solution review handling
  const openReviewSolutionModal = (bc) => {
    setSolutionModal({
      isOpen: true,
      batchComment: bc,
      coordinatorFeedback: bc.coordinator_feedback || '',
      saving: false,
    });
  };

  const handleUpdateSolutionStatus = async (status) => {
    if (!solutionModal.batchComment) return;

    try {
      setSolutionModal(prev => ({ ...prev, saving: true }));
      await api.put(`/reviews/batch-comments/${solutionModal.batchComment.id}/status`, {
        status,
        coordinator_feedback: solutionModal.coordinatorFeedback,
      });
      toast.success(`Solution marked as ${status === 'approved' ? 'Approved' : 'Needs Revision'}`);
      setSolutionModal({ isOpen: false, batchComment: null, coordinatorFeedback: '', saving: false });
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to update solution status');
    } finally {
      setSolutionModal(prev => ({ ...prev, saving: false }));
    }
  };

  const openSeenModal = async (review) => {
    setSeenModal({ isOpen: true, review, details: null, loading: true });
    try {
      const res = await api.get(`/reviews/${review.id}`);
      setSeenModal({ isOpen: true, review, details: res.data, loading: false });
    } catch (err) {
      toast.error('Failed to fetch acknowledgement details');
      setSeenModal({ isOpen: false, review: null, details: null, loading: false });
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Reviews & Batch Comments</h1>
            <p className="text-sm text-gray-500">
              Conduct weekly reviews, give specific comments to each batch (Batch 1 - 16), inspect submitted solutions & verify student progress
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2 text-xs"
            >
              <FiPlus className="w-4 h-4" />
              Post Weekly Review
            </button>
          </div>
        </div>

        {/* Batch Cohort Filter */}
        <div className="card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Viewing Cohort:</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_year})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-gray-400 font-medium">
            {reviews.length} weekly review sessions conducted
          </span>
        </div>

        {/* Reviews List */}
        {loading ? (
          <Loading text="Loading reviews..." />
        ) : (
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No weekly reviews posted for this batch yet. Click &quot;Post Weekly Review&quot; above to create Week 1 Review.
              </div>
            ) : (
              reviews.map((r) => {
                const totalAudience = parseInt(r.total_audience || 0, 10);
                const seenCount = parseInt(r.seen_count || 0, 10);
                const batchCommentsList = r.batch_comments || [];
                const submittedSolutionsCount = batchCommentsList.filter(b => b.status === 'submitted' || b.status === 'approved').length;

                return (
                  <div key={r.id} className="card p-6 space-y-5 hover:border-gray-300 transition-all border-2 border-primary-100">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-gray-900">Week {r.week_no} Review Session</span>
                          <span className="text-xs bg-primary-50 text-primary-700 font-bold px-2.5 py-0.5 rounded-full">
                            {r.batch_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Conducted on: <strong>{new Date(r.review_date).toLocaleDateString()}</strong> • Posted by {r.created_by_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openGiveBatchCommentModal(r.id)}
                          className="btn-primary text-xs inline-flex items-center gap-1.5"
                        >
                          <FiPlus className="w-3.5 h-3.5" />
                          Give Comments to a Batch
                        </button>

                        <button
                          onClick={() => openSeenModal(r)}
                          className="btn-secondary text-xs inline-flex items-center gap-1.5"
                          title="View student acknowledgements"
                        >
                          <FiEye className="w-3.5 h-3.5 text-primary-600" />
                          Seen ({seenCount}/{totalAudience})
                        </button>

                        <button
                          onClick={() => openEditReview(r)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit Weekly Review"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Delete Review"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* General Suggestions */}
                    {r.suggestions && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Cohort-Wide General Suggestions & Guidance
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {r.suggestions}
                        </p>
                      </div>
                    )}

                    {/* Action Items */}
                    {r.action_items && r.action_items.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {r.action_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-gray-100 text-xs text-gray-800"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium">{item.item}</p>
                              {item.due_date && (
                                <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                                  Due: {item.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* BATCH-SPECIFIC COMMENTS & SOLUTIONS SECTION (CORE REQUIREMENT) */}
                    {/* ========================================================= */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <span>Comments Given to Each Batch & Submitted Solutions</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                              {batchCommentsList.length} Batches Commented • {submittedSolutionsCount} Solutions Submitted
                            </span>
                          </h3>
                          <p className="text-xs text-gray-400">
                            Each batch receives specific feedback; their students and guide view the comments and submit solutions.
                          </p>
                        </div>
                      </div>

                      {batchCommentsList.length === 0 ? (
                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                          <span>No specific comments given to any project batch for Week {r.week_no} yet.</span>
                          <button
                            onClick={() => openGiveBatchCommentModal(r.id)}
                            className="font-bold text-primary-700 hover:underline"
                          >
                            + Give Comments Now
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {batchCommentsList.map((bc) => (
                            <div
                              key={bc.id}
                              className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                                bc.status === 'approved'
                                  ? 'bg-emerald-50/30 border-emerald-200'
                                  : bc.status === 'submitted'
                                  ? 'bg-blue-50/40 border-blue-200'
                                  : bc.status === 'needs_revision'
                                  ? 'bg-rose-50/30 border-rose-200'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-gray-900">{bc.team_name}</span>
                                    {bc.guide_name && (
                                      <span className="text-[10px] text-gray-500 font-medium">Guide: {bc.guide_name}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-primary-700 font-medium line-clamp-1">
                                    {bc.project_title || 'Untitled Project'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {bc.status === 'approved' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                      <FiCheck className="w-3 h-3" /> Approved
                                    </span>
                                  )}
                                  {bc.status === 'submitted' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                      Solution Submitted
                                    </span>
                                  )}
                                  {bc.status === 'needs_revision' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                      Needs Revision
                                    </span>
                                  )}
                                  {bc.status === 'pending' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Pending Solution
                                    </span>
                                  )}

                                  <button
                                    onClick={() => openGiveBatchCommentModal(r.id, bc.team_id, bc.comments)}
                                    className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-white transition-colors"
                                    title="Edit Comments for this Batch"
                                  >
                                    <FiEdit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Coordinator comments */}
                              <div className="bg-white/80 p-2.5 rounded-lg border border-gray-100 text-gray-700">
                                <strong className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                  Coordinator Comments:
                                </strong>
                                <p className="whitespace-pre-line text-xs">{bc.comments}</p>
                              </div>

                              {/* Solution Details if Submitted */}
                              {bc.solution_text ? (
                                <div className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <strong className="text-emerald-800 font-bold flex items-center gap-1">
                                      <FiCheckCircle className="w-3 h-3 text-emerald-600" />
                                      Submitted Solution ({bc.submitter_name || 'Student'})
                                    </strong>
                                    <span className="text-[10px] text-gray-400">
                                      {new Date(bc.solution_submitted_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 line-clamp-2 text-xs">{bc.solution_text}</p>
                                  {bc.solution_link && (
                                    <a
                                      href={bc.solution_link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary-600 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                                    >
                                      Solution Attachment / Link <FiExternalLink className="w-3 h-3" />
                                    </a>
                                  )}

                                  <div className="pt-1 flex items-center justify-between">
                                    <button
                                      onClick={() => openReviewSolutionModal(bc)}
                                      className="btn-secondary text-[10px] py-1 px-2.5 font-bold text-primary-700"
                                    >
                                      Review & Grade Solution &rarr;
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-400 italic">
                                  Waiting for {bc.team_name} students / guide to submit solution.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Give Comments to Batch Modal */}
      <Modal
        isOpen={batchCommentModal.isOpen}
        onClose={() => setBatchCommentModal(prev => ({ ...prev, isOpen: false }))}
        title="Give Weekly Review Comments to a Batch"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveBatchComment} className="space-y-4">
          <div>
            <label className="label-text">Select Batch / Team</label>
            <select
              required
              value={batchCommentModal.teamId}
              onChange={(e) => setBatchCommentModal({ ...batchCommentModal, teamId: e.target.value })}
              className="input-field font-semibold"
            >
              <option value="">Select Batch</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.project_title || 'Untitled'} (Guide: {t.guide_name || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Comments / Feedback / Requirements for this Batch</label>
            <textarea
              required
              rows={5}
              value={batchCommentModal.comments}
              onChange={(e) => setBatchCommentModal({ ...batchCommentModal, comments: e.target.value })}
              placeholder="e.g. 1. Complete API integration by Friday. 2. Implement unit tests for auth service. 3. Fix database schema relationships."
              className="input-field"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              These comments will be displayed on this batch&apos;s student dashboard and their faculty guide dashboard. They will be required to submit a solution.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBatchCommentModal(prev => ({ ...prev, isOpen: false }))}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={batchCommentModal.saving}
              className="btn-primary text-xs"
            >
              {batchCommentModal.saving ? 'Saving...' : 'Post Comments to Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Submitted Solution Modal */}
      <Modal
        isOpen={solutionModal.isOpen}
        onClose={() => setSolutionModal(prev => ({ ...prev, isOpen: false }))}
        title={`Review Solution from ${solutionModal.batchComment?.team_name || 'Batch'}`}
        maxWidth="max-w-2xl"
      >
        {solutionModal.batchComment && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
              <strong className="text-gray-500 uppercase font-bold text-[10px] block">
                Coordinator&apos;s Original Comments:
              </strong>
              <p className="text-gray-800 whitespace-pre-line font-medium">
                {solutionModal.batchComment.comments}
              </p>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-900 uppercase font-bold text-[11px]">
                  Batch Solution Submitted by {solutionModal.batchComment.submitter_name || 'Student'}:
                </strong>
                <span className="text-[10px] text-gray-500">
                  {new Date(solutionModal.batchComment.solution_submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-line leading-relaxed text-sm bg-white p-3 rounded-lg border border-emerald-100">
                {solutionModal.batchComment.solution_text}
              </p>

              {solutionModal.batchComment.solution_link && (
                <div className="pt-1">
                  <a
                    href={solutionModal.batchComment.solution_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-700 font-bold underline inline-flex items-center gap-1.5"
                  >
                    Open Solution Work Link / Drive / GitHub <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="label-text">Coordinator Verification Remarks / Revision Notes (Optional)</label>
              <textarea
                rows={3}
                value={solutionModal.coordinatorFeedback}
                onChange={(e) => setSolutionModal({ ...solutionModal, coordinatorFeedback: e.target.value })}
                placeholder="e.g. Solution verified. Good job on addressing the database indexes."
                className="input-field text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSolutionModal(prev => ({ ...prev, isOpen: false }))}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={solutionModal.saving}
                onClick={() => handleUpdateSolutionStatus('needs_revision')}
                className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
              >
                Request Revision
              </button>
              <button
                type="button"
                disabled={solutionModal.saving}
                onClick={() => handleUpdateSolutionStatus('approved')}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
              >
                ✓ Approve Solution
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Post / Edit Review Modal */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false, isEditing: false, reviewId: null })}
        title={reviewModal.isEditing ? 'Edit Weekly Review Session' : 'Post Weekly Review for Batch'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveReview} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Cohort</label>
              <select
                required
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Cohort</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Week No.</label>
              <input
                type="number"
                min="1"
                max="52"
                required
                value={formData.week_no}
                onChange={(e) => setFormData({ ...formData, week_no: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text">Review Date</label>
              <input
                type="date"
                required
                value={formData.review_date}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Cohort-Wide Suggestions & Overall Review Guidance</label>
            <textarea
              rows={4}
              value={formData.suggestions}
              onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
              placeholder="Enter general suggestions applicable to all batches (e.g. Ensure all teams complete architecture diagrams)..."
              className="input-field"
            />
          </div>

          {/* Action Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-text mb-0">General Milestone Deliverables</label>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {formData.action_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Deliverable description..."
                    value={item.item}
                    onChange={(e) => handleActionItemChange(idx, 'item', e.target.value)}
                    className="input-field flex-1 text-xs"
                  />
                  <input
                    type="date"
                    value={item.due_date || ''}
                    onChange={(e) => handleActionItemChange(idx, 'due_date', e.target.value)}
                    className="input-field w-36 text-xs"
                  />
                  {formData.action_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveActionItem(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text">Guidelines Link (Optional)</label>
            <input
              type="url"
              value={formData.attachment_link}
              onChange={(e) => setFormData({ ...formData, attachment_link: e.target.value })}
              placeholder="https://drive.google.com/..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReviewModal({ isOpen: false, isEditing: false, reviewId: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : reviewModal.isEditing ? 'Update Review' : 'Publish Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Seen Modal */}
      <Modal
        isOpen={seenModal.isOpen}
        onClose={() => setSeenModal({ isOpen: false, review: null, details: null, loading: false })}
        title={`Week ${seenModal.review?.week_no} Acknowledgements`}
      >
        <div className="space-y-4">
          {seenModal.loading ? (
            <Loading text="Loading..." />
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <span className="font-bold text-emerald-800 block mb-2">Seen ({seenModal.details?.acks?.length || 0})</span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {seenModal.details?.acks?.map((a) => (
                    <div key={a.user_id} className="text-gray-700">
                      {a.name || a.user_name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <span className="font-bold text-rose-800 block mb-2">Not Seen ({seenModal.details?.notSeen?.length || 0})</span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {seenModal.details?.notSeen?.map((u) => (
                    <div key={u.id} className="text-gray-700">
                      {u.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
