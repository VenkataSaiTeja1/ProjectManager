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
  FiEdit2,
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

  // Edit Team Details Modal
  const [editTeamModal, setEditTeamModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    project_title: '',
    project_description: '',
    batch_id: '',
    guide_id: '',
    lead_id: '',
    status: 'active',
    progress_percent: 0,
  });
  const [savingEdit, setSavingEdit] = useState(false);

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
      const [tRes, uRes, pRes, fRes, bRes, facRes, studRes] = await Promise.all([
        api.get(`/teams/${id}`),
        api.get(`/daily-updates/team/${id}`),
        api.get('/papers', { team_id: id }),
        api.get('/followups', { team_id: id }),
        api.get('/batches'),
        api.get('/users', { role: 'faculty', limit: 100 }),
        api.get('/users', { role: 'student', limit: 200 }),
      ]);
      setTeam(tRes.data);
      setEditStatus(tRes.data.status);
      setEditProgress(tRes.data.progress_percent || 0);
      setUpdates(uRes.data || []);
      setPapers(pRes.data || []);
      setFollowups(fRes.data || []);
      setBatches(bRes.data || []);
      setFacultyList(facRes.data || []);
      setStudentsList(studRes.data || []);

      setEditFormData({
        name: tRes.data.name || '',
        project_title: tRes.data.project_title || '',
        project_description: tRes.data.project_description || '',
        batch_id: tRes.data.batch_id || '',
        guide_id: tRes.data.guide_id || '',
        lead_id: tRes.data.lead_id || '',
        status: tRes.data.status || 'active',
        progress_percent: tRes.data.progress_percent || 0,
      });
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

  const handleSaveTeamEdit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api.put(`/teams/${id}`, {
        name: editFormData.name,
        project_title: editFormData.project_title || null,
        project_description: editFormData.project_description || null,
        batch_id: editFormData.batch_id ? parseInt(editFormData.batch_id, 10) : undefined,
        guide_id: editFormData.guide_id ? parseInt(editFormData.guide_id, 10) : null,
        lead_id: editFormData.lead_id ? parseInt(editFormData.lead_id, 10) : null,
        status: editFormData.status,
        progress_percent: parseInt(editFormData.progress_percent || 0, 10),
      });
      toast.success('Project details updated successfully');
      setEditTeamModal(false);
      fetchTeamDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to update project details');
    } finally {
      setSavingEdit(false);
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
      toast.success('Student enrolled into team');
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/teams')}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Teams List
          </button>

          <button
            onClick={() => setEditTeamModal(true)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <FiEdit2 className="w-3.5 h-3.5 text-primary-600" />
            Edit Project & Team Details
          </button>
        </div>

        {/* Team Header Card */}
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">{team.name}</h1>
                <Badge status={team.status} />
              </div>
              <p className="text-base font-semibold text-primary-700 mt-1">
                {team.project_title || <span className="text-amber-600 italic">No project title set (Click Edit to add)</span>}
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
            {/* Guide Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Faculty Guide</span>
                <span className="font-bold text-sm text-gray-900">{team.guide_name || 'Not assigned'}</span>
                {team.guide_roll_number && (
                  <span className="text-xs text-gray-400 font-mono block">[{team.guide_roll_number}]</span>
                )}
              </div>
            </div>

            {/* Lead Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Team Lead</span>
                <span className="font-bold text-sm text-gray-900">{team.lead_name || 'Not assigned'}</span>
                {team.lead_roll_number && (
                  <span className="text-xs text-gray-400 font-mono block">[{team.lead_roll_number}]</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="section-title">Team Roster ({team.members?.length || 0} Members)</h2>
              <p className="text-xs text-gray-400">Students enrolled in this capstone team</p>
            </div>
            <button onClick={openAddMember} className="btn-secondary text-xs inline-flex items-center gap-1.5">
              <FiPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.members?.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{m.name}</span>
                    {m.is_lead && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Lead
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-700 font-mono font-bold uppercase">{m.roll_number || '—'}</p>
                </div>

                {!m.is_lead && (
                  <button
                    onClick={() => handleRemoveMember(m.id, m.name)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                    title="Remove Member"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Updates History */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="section-title">Daily Progress Logs & Status Updates</h2>
              <p className="text-xs text-gray-400">Historical daily updates submitted by team lead</p>
            </div>
          </div>

          {updates.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No daily logs submitted yet for this team.</p>
          ) : (
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {new Date(u.update_date).toLocaleDateString()}
                      </span>
                      {u.is_late && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Submitted Late
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary-700">
                        {u.percent_complete}% Done
                      </span>
                      <button
                        onClick={() => setCommentModal({ isOpen: true, updateId: u.id })}
                        className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        Add Recommendation
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="text-gray-700 block mb-0.5">Done Today:</strong>
                      <p className="text-gray-600">{u.done_today}</p>
                    </div>
                    {u.plan_tomorrow && (
                      <div>
                        <strong className="text-gray-700 block mb-0.5">Plan for Tomorrow:</strong>
                        <p className="text-gray-600">{u.plan_tomorrow}</p>
                      </div>
                    )}
                  </div>

                  {u.blockers && (
                    <div className="text-xs bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-800">
                      <strong>Current Blocker / Challenge:</strong> {u.blockers}
                    </div>
                  )}

                  {/* Comments */}
                  {u.comments && u.comments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                      <strong className="text-[11px] uppercase tracking-wider text-gray-400 block">
                        Coordinator / Guide Comments:
                      </strong>
                      {u.comments.map((c) => (
                        <div key={c.id} className="text-xs bg-white p-2 rounded border border-gray-100">
                          <span className="font-semibold text-gray-800">{c.user_name}: </span>
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

      {/* Edit Team & Project Details Modal */}
      <Modal
        isOpen={editTeamModal}
        onClose={() => setEditTeamModal(false)}
        title="Edit Project and Team Information"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveTeamEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Batch</label>
              <select
                value={editFormData.batch_id}
                onChange={(e) => setEditFormData({ ...editFormData, batch_id: e.target.value })}
                className="input-field"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Team Name</label>
              <input
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Project Title / Project Name</label>
            <input
              value={editFormData.project_title}
              onChange={(e) => setEditFormData({ ...editFormData, project_title: e.target.value })}
              placeholder="e.g. Smart IoT Agriculture Monitor"
              className="input-field font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="label-text">Project Abstract / Description</label>
            <textarea
              rows={3}
              value={editFormData.project_description}
              onChange={(e) => setEditFormData({ ...editFormData, project_description: e.target.value })}
              placeholder="Project description, scope, and objectives..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Faculty Guide</label>
              <select
                value={editFormData.guide_id}
                onChange={(e) => setEditFormData({ ...editFormData, guide_id: e.target.value })}
                className="input-field"
              >
                <option value="">Unassigned</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.roll_number ? `[${f.roll_number}] ` : ''}{f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Team Lead</label>
              <select
                value={editFormData.lead_id}
                onChange={(e) => setEditFormData({ ...editFormData, lead_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Team Lead</option>
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.roll_number ? `[${s.roll_number}] ` : ''}{s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="pending_review">Pending Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="label-text">Progress ({editFormData.progress_percent || 0}%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editFormData.progress_percent}
                onChange={(e) => setEditFormData({ ...editFormData, progress_percent: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditTeamModal(false)}
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
