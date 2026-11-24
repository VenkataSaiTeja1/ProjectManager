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
  FiEdit2,
} from 'react-icons/fi';

export default function FacultyTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Project Info Modal
  const [editModal, setEditModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
      setProjectTitle(tRes.data.project_title || '');
      setProjectDescription(tRes.data.project_description || '');
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

  const handleSaveProjectInfo = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api.put(`/teams/${id}`, {
        project_title: projectTitle || null,
        project_description: projectDescription || null,
      });
      toast.success('Project title and description updated');
      setEditModal(false);
      fetchTeam();
    } catch (err) {
      toast.error(err.message || 'Failed to update project info');
    } finally {
      setSavingEdit(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/faculty/dashboard')}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Faculty Dashboard
          </button>

          <button
            onClick={() => {
              setProjectTitle(team.project_title || '');
              setProjectDescription(team.project_description || '');
              setEditModal(true);
            }}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <FiEdit2 className="w-3.5 h-3.5 text-primary-600" />
            Edit Project Title & Description
          </button>
        </div>

        {/* Team Header */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">{team.name}</h1>
                <Badge status={team.status} />
              </div>
              <p className="text-base font-semibold text-primary-700 mt-1">
                {team.project_title || <span className="text-amber-600 italic">No project title set (Click Edit above)</span>}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-400 block">Overall Progress</span>
              <span className="text-2xl font-black text-primary-600">{team.progress_percent || 0}%</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {team.project_description || 'No project description added yet.'}
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
                <div className="text-primary-700 font-mono font-bold mt-1 uppercase text-[11px]">{m.roll_number || '—'}</div>
                {m.email && <div className="text-gray-400 text-[11px]">{m.email}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Updates Review */}
        <div className="card space-y-4">
          <h3 className="section-title">Submitted Daily Work Logs</h3>
          {updates.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No daily logs submitted yet by this team.</p>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      {u.is_late && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Late
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-700">{u.percent_complete}% Done</span>
                      <button
                        onClick={() => setCommentModal({ isOpen: true, updateId: u.id })}
                        className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        Add Feedback
                      </button>
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-700 block mb-0.5">Completed Today:</strong>
                    <p className="text-gray-600">{u.done_today}</p>
                  </div>

                  {u.plan_tomorrow && (
                    <div>
                      <strong className="text-gray-700 block mb-0.5">Tomorrow&apos;s Target:</strong>
                      <p className="text-gray-600">{u.plan_tomorrow}</p>
                    </div>
                  )}

                  {u.blockers && (
                    <div className="bg-rose-50 p-2 rounded border border-rose-100 text-rose-800">
                      <strong>Blocker:</strong> {u.blockers}
                    </div>
                  )}

                  {u.comments && u.comments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Feedback Thread:</span>
                      {u.comments.map((c) => (
                        <div key={c.id} className="p-2 bg-white rounded border border-gray-100">
                          <span className="font-bold text-gray-800">{c.user_name}: </span>
                          <span className="text-gray-600">{c.comment}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Info Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Project Title & Description"
      >
        <form onSubmit={handleSaveProjectInfo} className="space-y-4">
          <div>
            <label className="label-text">Project Title / Name</label>
            <input
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. AI-driven Autonomous Rover"
              className="input-field font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="label-text">Project Abstract / Scope Description</label>
            <textarea
              rows={4}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe the project scope, methodology, and tech stack..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingEdit} className="btn-primary text-xs">
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Comment Modal */}
      <Modal
        isOpen={commentModal.isOpen}
        onClose={() => setCommentModal({ isOpen: false, updateId: null })}
        title="Post Feedback for Today's Update"
      >
        <form onSubmit={handlePostComment} className="space-y-4">
          <div>
            <label className="label-text">Feedback Comment</label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Good progress on frontend. Make sure to test edge cases for login before tomorrow."
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
              {savingComment ? 'Posting...' : 'Post Feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
