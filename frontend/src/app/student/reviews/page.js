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
} from 'react-icons/fi';

export default function StudentReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState({});

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

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Reviews & Batch Suggestions</h1>
          <p className="text-sm text-gray-500">
            Review guidelines posted by project coordinator, check action items & acknowledge receipt
          </p>
        </div>

        {loading ? (
          <Loading text="Loading weekly reviews..." />
        ) : (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No weekly reviews published for your batch yet.
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-gray-900">Week {r.week_no} Review</span>
                        <span className="text-xs bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                          {r.batch_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Date: {new Date(r.review_date).toLocaleDateString()} • Posted by {r.created_by_name}
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
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{r.suggestions}</p>
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
                            <input
                              type="checkbox"
                              defaultChecked={item.completed}
                              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                            />
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
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
