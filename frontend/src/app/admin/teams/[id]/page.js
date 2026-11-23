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
  FiUser,
  FiMail,
  FiPhone,
  FiPlus,
  FiTrash2,
  FiMessageSquare,
  FiFileText,
  FiCalendar,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';

export default function AdminTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [papers, setPapers] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status & Progress update state
  const [editStatus, setEditStatus] = useState('active');
  const [editProgress, setEditProgress] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);

  // Comment Modal state
  const [commentModal, setCommentModal] = useState({ isOpen: false, updateId: null });
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Add Member Modal
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const [tRes, uRes, pRes, fRes] = await Promise.all([
        api.get(`/teams/${id}`),
        api.get(`/daily-updates/team/${id}`),
        api.get('/papers', { team_id: id }),
        api.get('/followups', { team_id: id }),
      ]);
      setTeam(tRes.data);
      setEditStatus(tRes.data.status);
      setEditProgress(tRes.data.progress_percent || 0);
      setUpdates(uRes.data || []);
      setPapers(pRes.data || []);
      setFollowups(fRes.data || []);
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const handleUpdateStatus = async () => {
    try {
      setSavingStatus(true);
      await api.put(`/teams/${id}`, {
        status: editStatus,
        progress_percent: parseInt(editProgress, 10),
      });
      toast.success('Team status and progress updated');
      fetchTeamDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSavingComment(true);
      await api.post(`/daily-updates/${commentModal.updateId}/comments`, {
        comment: commentText,
      });
      toast.success('Comment added');
      setCommentModal({ isOpen: false, updateId: null });
      setCommentText('');
      fetchTeamDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  const openAddMember = async () => {
    try {
      const res = await api.get('/users', { role: 'student', limit: 200 });
      setCandidateStudents(res.data || []);
      setSelectedStudentId('');
      setAddMemberModal(true);
    } catch (err) {
      toast.error('Failed to load students');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      setSavingMember(true);
      await api.post(`/teams/${id}/members`, { user_id: parseInt(selectedStudentId, 10) });
      toast.success('Member added');
      setAddMemberModal(false);
      fetchTeamDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this team?`)) return;
    try {
      await api.delete(`/teams/${id}/members/${userId}`);
      toast.success('Member removed');
      fetchTeamDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <AppLayout requiredRole="admin">
        <Loading text="Loading project details..." />
      </AppLayout>
    );
  }

  if (!team) return null;

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <button
          onClick={() => router.push('/admin/teams')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Teams List
        </button>

        {/* Team Header Card */}
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">{team.name}</h1>
                <Badge status={team.status} />
              </div>
              <p className="text-base font-semibold text-primary-700 mt-1">
                {team.project_title || 'Untitled Project'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Cohort: {team.batch_name}</p>
            </div>

            {/* Quick Status and Progress Editor */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="text-xs font-semibold px-2 py-1 bg-white border border-gray-200 rounded-lg outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                  Progress ({editProgress}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editProgress}
                  onChange={(e) => setEditProgress(e.target.value)}
                  className="w-24 accent-primary-600"
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={savingStatus}
                className="btn-primary text-xs py-1.5 px-3 self-end"
              >
                {savingStatus ? '...' : 'Update'}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {team.project_description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                TL
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Team Lead</span>
                <p className="text-sm font-bold text-gray-900">
                  {team.lead_roll_number ? `[${team.lead_roll_number}] ` : ''}{team.lead_name || 'Unassigned'}
                </p>
                {team.lead_phone && <p className="text-xs text-gray-500 font-mono">{team.lead_phone}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                FG
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Faculty Guide</span>
                <p className="text-sm font-bold text-gray-900">
                  {team.guide_roll_number ? `[${team.guide_roll_number}] ` : ''}{team.guide_name || 'Unassigned'}
                </p>
                {team.guide_email && <p className="text-xs text-gray-500 font-mono">{team.guide_email}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Team Members ({team.members?.length || 0})</h3>
            <button onClick={openAddMember} className="btn-secondary text-xs inline-flex items-center gap-1.5">
              <FiPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {team.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {m.roll_number ? `[${m.roll_number}] ` : ''}{m.name}
                    </span>
                    {m.is_lead && (
                      <span className="text-[10px] font-black uppercase bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                        Lead
                      </span>
                    )}
                  </div>
                  {m.phone && <p className="text-xs text-gray-500 font-mono">{m.phone}</p>}
                </div>

                {!m.is_lead && (
                  <button
                    onClick={() => handleRemoveMember(m.id, m.name)}
                    className="text-gray-400 hover:text-rose-600 p-1"
                    title="Remove member"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Updates History */}
        <div className="card">
          <h3 className="section-title mb-4">Daily Status Submissions History</h3>
          {updates.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No daily updates recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {updates.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-bold text-gray-900">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      {u.is_late ? (
                        <Badge status="late" text="Late" size="sm" />
                      ) : (
                        <Badge status="submitted" text="On-Time" size="sm" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
                      {u.percent_complete}% Completed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 mt-2">
                    <div>
                      <strong className="text-gray-900 block mb-0.5">Done Today:</strong>
                      <p className="bg-white p-2 rounded-lg border border-gray-100">{u.done_today}</p>
                    </div>
                    <div>
                      <strong className="text-gray-900 block mb-0.5">Plan Tomorrow:</strong>
                      <p className="bg-white p-2 rounded-lg border border-gray-100">{u.plan_tomorrow || 'None specified'}</p>
                    </div>
                  </div>

                  {u.blockers && (
                    <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <strong>Blockers:</strong> {u.blockers}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setCommentModal({ isOpen: true, updateId: u.id });
                        setCommentText('');
                      }}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                    >
                      <FiMessageSquare className="w-3.5 h-3.5" />
                      Add Coordinator Note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up Calls */}
        <div className="card">
          <h3 className="section-title mb-3">Coordinator Follow-ups Log</h3>
          {followups.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No follow-ups recorded.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {followups.map((f) => (
                <div key={f.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{f.note}</p>
                    <p className="text-[11px] text-gray-400">By {f.created_by_name}</p>
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {new Date(f.called_on).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={addMemberModal}
        onClose={() => setAddMemberModal(false)}
        title="Enroll Student to Team"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="label-text">Select Student</label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field"
            >
              <option value="">Select Student</option>
              {candidateStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roll_number ? `[${s.roll_number}] ` : ''}{s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddMemberModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingMember} className="btn-primary text-xs">
              {savingMember ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Comment Modal */}
      <Modal
        isOpen={commentModal.isOpen}
        onClose={() => setCommentModal({ isOpen: false, updateId: null })}
        title="Add Review Comment"
      >
        <form onSubmit={handleAddComment} className="space-y-4">
          <div>
            <label className="label-text">Comment / Recommendation</label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Please verify module architecture before next week's presentation."
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
              {savingComment ? 'Saving...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
