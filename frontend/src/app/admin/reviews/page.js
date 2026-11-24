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
} from 'react-icons/fi';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [batches, setBatches] = useState([]);
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

  // Seen & Responses Modal
  const [seenModal, setSeenModal] = useState({ isOpen: false, review: null, details: null, loading: false });

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data || []);
      if (res.data?.length > 0 && !selectedBatch) {
        setSelectedBatch(res.data[0].id);
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
    fetchBatches();
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

  const handleUpdateRemarkStatus = async (remarkId, newStatus) => {
    try {
      await api.put(`/reviews/remarks/${remarkId}`, { status: newStatus });
      toast.success(`Remark status updated to ${newStatus}`);
      if (seenModal.review) {
        const res = await api.get(`/reviews/${seenModal.review.id}`);
        setSeenModal(prev => ({ ...prev, details: res.data }));
      }
      fetchReviews();
    } catch (err) {
      toast.error('Failed to update remark status');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Reviews & Feedback</h1>
            <p className="text-sm text-gray-500">Post weekly milestone reviews, action items, audit student acknowledgements & view responses</p>
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

        {/* Batch Filter */}
        <div className="card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Viewing Batch:</label>
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
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No weekly reviews posted for this batch yet. Click &quot;Post Weekly Review&quot; above.
              </div>
            ) : (
              reviews.map((r) => {
                const totalAudience = parseInt(r.total_audience || 0, 10);
                const seenCount = parseInt(r.seen_count || 0, 10);
                const answersCount = r.remarks?.length || 0;

                return (
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
                          Conducted on: <strong>{new Date(r.review_date).toLocaleDateString()}</strong> • Posted by {r.created_by_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openSeenModal(r)}
                          className="btn-secondary text-xs inline-flex items-center gap-1.5"
                          title="View student acknowledgements & team answers"
                        >
                          <FiMessageSquare className="w-3.5 h-3.5 text-primary-600" />
                          Answers ({answersCount}) & Seen ({seenCount}/{totalAudience})
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

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Coordinator Suggestions & Guidance
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {r.suggestions || 'No general suggestions noted.'}
                      </p>
                    </div>

                    {/* Action Items */}
                    {r.action_items && r.action_items.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                          Milestone Action Items
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      </div>
                    )}

                    {r.attachment_link && (
                      <div className="flex items-center gap-2 text-xs">
                        <FiPaperclip className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-500">Reference Guidelines:</span>
                        <a
                          href={r.attachment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          {r.attachment_link}
                          <FiExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Student & Faculty Answers / Remarks Section */}
                    {r.remarks && r.remarks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary-800 flex items-center gap-1.5">
                            <FiMessageSquare className="w-3.5 h-3.5 text-primary-600" />
                            Batch Answers & Remarks ({r.remarks.length})
                          </span>
                        </div>

                        <div className="space-y-2">
                          {r.remarks.map((rem) => (
                            <div key={rem.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">{rem.user_name}</span>
                                  {rem.user_roll_number && (
                                    <span className="font-mono text-gray-500 font-semibold">[{rem.user_roll_number}]</span>
                                  )}
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    rem.user_role === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {rem.user_role}
                                  </span>
                                  {rem.team_name && (
                                    <span className="text-gray-400 font-medium">({rem.team_name})</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(rem.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700 whitespace-pre-line leading-relaxed pl-1">
                                {rem.remark}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Post / Edit Review Modal */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false, isEditing: false, reviewId: null })}
        title={reviewModal.isEditing ? 'Edit Weekly Review' : 'Post Weekly Review for Batch'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveReview} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Batch</label>
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
            <label className="label-text">Coordinator Suggestions & Feedback</label>
            <textarea
              required
              rows={4}
              value={formData.suggestions}
              onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
              placeholder="Enter comprehensive suggestions for this week (e.g. Ensure all teams complete database ER diagrams and prepare wireframe mockups)..."
              className="input-field"
            />
          </div>

          {/* Action Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-text mb-0">Action Items & Deliverables</label>
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
            <label className="label-text">Reference Material Link (Optional)</label>
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
              {saving ? 'Saving...' : reviewModal.isEditing ? 'Update Review' : 'Publish to Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Seen Acknowledgement & Answers Details Modal */}
      <Modal
        isOpen={seenModal.isOpen}
        onClose={() => setSeenModal({ isOpen: false, review: null, details: null, loading: false })}
        title={`Week ${seenModal.review?.week_no} Responses & Acknowledgements`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              Audit student responses and acknowledgement status for this weekly review.
            </p>
            {seenModal.review && (
              <ExcelExportBtn
                endpoint="/reports/review-acks"
                params={{ review_id: seenModal.review.id }}
                filename={`review_acks_week_${seenModal.review.week_no}.xlsx`}
                label="Export Acks Excel"
              />
            )}
          </div>

          {seenModal.loading ? (
            <Loading text="Loading details..." />
          ) : (
            <div className="space-y-4">
              {/* Submitted Answers / Remarks */}
              <div className="bg-primary-50/40 p-4 rounded-xl border border-primary-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-900 mb-2 flex items-center justify-between">
                  <span>Student & Faculty Answers ({seenModal.details?.remarks?.length || 0})</span>
                </h4>
                {seenModal.details?.remarks?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No answers or comments submitted yet for this review.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                    {seenModal.details?.remarks?.map((rem) => (
                      <div key={rem.id} className="p-3 bg-white rounded-lg border border-gray-100 space-y-1">
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
                          <div className="flex items-center gap-2">
                            <select
                              value={rem.status || 'pending'}
                              onChange={(e) => handleUpdateRemarkStatus(rem.id, e.target.value)}
                              className="text-[10px] font-bold border border-gray-200 rounded px-1.5 py-0.5 outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="needs_work">Needs Work</option>
                            </select>
                            <span className="text-[10px] text-gray-400">{new Date(rem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line pl-0.5">{rem.remark}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acknowledgement Seen/Unseen Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
                    Seen ({seenModal.details?.acks?.length || 0})
                  </h4>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-emerald-100/60 text-xs">
                    {seenModal.details?.acks?.length === 0 ? (
                      <p className="text-gray-400">No one has acknowledged yet.</p>
                    ) : (
                      seenModal.details?.acks?.map((a) => (
                        <div key={a.user_id} className="pt-1.5">
                          <span className="font-bold text-gray-800">{a.user_name}</span>
                          {a.user_roll_number && <span className="text-primary-700 font-mono font-bold ml-1">[{a.user_roll_number}]</span>}
                          <span className="text-[10px] text-gray-400 block">
                            Seen: {new Date(a.seen_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2">
                    Not Seen ({seenModal.details?.notSeen?.length || 0})
                  </h4>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-rose-100/60 text-xs">
                    {seenModal.details?.notSeen?.length === 0 ? (
                      <p className="text-emerald-700 font-bold">All enrolled students have seen this review.</p>
                    ) : (
                      seenModal.details?.notSeen?.map((u) => (
                        <div key={u.id} className="pt-1.5">
                          <span className="font-semibold text-gray-700">{u.name}</span>
                          {u.roll_number && <span className="text-primary-700 font-mono text-[11px] ml-1">[{u.roll_number}]</span>}
                          {u.email && <span className="text-[10px] text-gray-400 block">{u.email}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
