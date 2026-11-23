'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiCalendar,
  FiMessageSquare,
  FiUsers,
  FiExternalLink,
  FiSend,
} from 'react-icons/fi';

export default function FacultyTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comment Modal
  const [commentModal, setCommentModal] = useState({ isOpen: false, updateId: null });
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const [tRes, uRes] = await Promise.all([
        api.get(`/teams/${id}`),
        api.get(`/daily-updates/team/${id}`),
      ]);
      setTeam(tRes.data);
      setUpdates(uRes.data || []);
    } catch (err) {
      toast.error('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSavingComment(true);
      await api.post(`/daily-updates/${commentModal.updateId}/comments`, {
        comment: commentText,
      });
      toast.success('Feedback comment posted to students');
      setCommentModal({ isOpen: false, updateId: null });
      setCommentText('');
      fetchTeam();
    } catch (err) {
      toast.error(err.message || 'Error posting comment');
    } finally {
      setSavingComment(false);
    }
  };

  if (loading) {
    return (
      <AppLayout requiredRole="faculty">
        <Loading text="Loading project details..." />
      </AppLayout>
    );
  }

  if (!team) return null;

  return (
    <AppLayout requiredRole="faculty">
      <div className="space-y-6">
        <button
          onClick={() => router.push('/faculty/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Faculty Dashboard
        </button>

        {/* Team Header */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">{team.name}</h1>
                <Badge status={team.status} />
              </div>
              <p className="text-sm font-semibold text-primary-700 mt-1">
                {team.project_title || 'Untitled Project'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-400 block">Overall Progress</span>
              <span className="text-2xl font-black text-primary-600">{team.progress_percent || 0}%</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {team.project_description || 'No project description added.'}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div>
              <strong>Team Lead:</strong> {team.lead_roll_number ? `[${team.lead_roll_number}] ` : ''}{team.lead_name}
              {team.lead_phone && ` (${team.lead_phone})`}
            </div>
            <div><strong>Cohort:</strong> {team.batch_name}</div>
          </div>
        </div>

        {/* Members */}
        <div className="card">
          <h3 className="section-title mb-3">Student Team Members ({team.members?.length || 0})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {team.members?.map((m) => (
              <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    {m.roll_number ? `[${m.roll_number}] ` : ''}{m.name}
                  </span>
                  {m.is_lead && (
                    <span className="bg-primary-100 text-primary-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      Lead
                    </span>
                  )}
                </div>
                {m.email && <p className="text-gray-500 mt-0.5">{m.email}</p>}
                {m.phone && <p className="text-gray-400 font-mono mt-0.5">{m.phone}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Updates */}
        <div className="card">
          <h3 className="section-title mb-4">Daily Status Updates & Guide Review Notes</h3>

          {updates.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No updates submitted by this team yet.</p>
          ) : (
            <div className="space-y-4">
              {updates.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-bold text-gray-900">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      {u.is_late && <Badge status="late" text="Late" size="sm" />}
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                      {u.percent_complete}% Done
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1.5 mt-2">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">Work Done Today:</strong>
                      <p>{u.done_today}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                      <strong className="text-gray-900 block mb-0.5">Plan for Tomorrow:</strong>
                      <p>{u.plan_tomorrow || 'None specified'}</p>
                    </div>

                    {u.blockers && (
                      <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-100">
                        <strong>Blockers / Issues Reported:</strong> {u.blockers}
                      </div>
                    )}

                    {u.link && (
                      <div className="text-[11px] pt-1">
                        <span className="text-gray-400">Code/Demo: </span>
                        <a
                          href={u.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline font-mono"
                        >
                          {u.link}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setCommentModal({ isOpen: true, updateId: u.id });
                        setCommentText('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      <FiMessageSquare className="w-3.5 h-3.5" />
                      Add Guide Remarks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guide Comment Modal */}
      <Modal
        isOpen={commentModal.isOpen}
        onClose={() => setCommentModal({ isOpen: false, updateId: null })}
        title="Post Guide Remark"
      >
        <form onSubmit={handlePostComment} className="space-y-4">
          <div>
            <label className="label-text">Remarks & Instructions for Student Team</label>
            <textarea
              required
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Good progress on the model training. For blockers, ensure the dataset is normalized before feature extraction."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCommentModal({ isOpen: false, updateId: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingComment} className="btn-primary text-xs">
              {savingComment ? 'Posting...' : 'Post Remark'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
