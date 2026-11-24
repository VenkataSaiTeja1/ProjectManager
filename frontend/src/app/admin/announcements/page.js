'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiMessageSquare, FiSend, FiUsers } from 'react-icons/fi';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({ isOpen: false, item: null });
  const [formData, setFormData] = useState({
    audience_type: 'all',
    batch_id: '',
    team_id: '',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aRes, bRes, tRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/batches'),
        api.get('/teams', { limit: 100 }),
      ]);
      setAnnouncements(aRes.data || []);
      setBatches(bRes.data || []);
      setTeams(tRes.data || []);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setModal({ isOpen: true, item: null });
    setFormData({ audience_type: 'all', batch_id: '', team_id: '', title: '', message: '' });
  };

  const openEditModal = (a) => {
    setModal({ isOpen: true, item: a });
    setFormData({
      audience_type: a.audience_type || 'all',
      batch_id: a.batch_id || '',
      team_id: a.team_id || '',
      title: a.title || '',
      message: a.message || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSending(true);
      const payload = {
        audience_type: formData.audience_type,
        batch_id: formData.batch_id ? parseInt(formData.batch_id, 10) : null,
        team_id: formData.team_id ? parseInt(formData.team_id, 10) : null,
        title: formData.title,
        message: formData.message,
      };

      if (modal.item) {
        await api.put(`/announcements/${modal.item.id}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement broadcasted');
      }
      setModal({ isOpen: false, item: null });
      setFormData({ audience_type: 'all', batch_id: '', team_id: '', title: '', message: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error saving announcement');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Announcements Broadcast</h1>
            <p className="text-sm text-gray-500">Post notifications and alerts to all users, specific cohorts or individual teams</p>
          </div>

          <button
            onClick={openCreateModal}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {loading ? (
          <Loading text="Loading announcements..." />
        ) : (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No announcements posted yet.
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="card p-5 space-y-2 hover:border-gray-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-gray-900">{a.title}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {a.audience_type === 'all'
                          ? 'All Users'
                          : a.audience_type === 'batch'
                          ? `Cohort: ${a.batch_name}`
                          : `Team: ${a.team_name}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(a)}
                        className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit Announcement"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Delete Announcement"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{a.message}</p>

                  <div className="pt-2 text-[11px] text-gray-400 border-t border-gray-100 flex items-center justify-between">
                    <span>Broadcast by {a.created_by_name}</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, item: null })}
        title={modal.item ? 'Edit Announcement' : 'Broadcast Announcement'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-text">Audience Scope</label>
            <select
              value={formData.audience_type}
              onChange={(e) => setFormData({ ...formData, audience_type: e.target.value })}
              className="input-field"
            >
              <option value="all">Entire College (All Faculty & Students)</option>
              <option value="batch">Specific Batch / Cohort</option>
              <option value="team">Single Project Team</option>
            </select>
          </div>

          {formData.audience_type === 'batch' && (
            <div>
              <label className="label-text">Select Batch</label>
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
          )}

          {formData.audience_type === 'team' && (
            <div>
              <label className="label-text">Select Team</label>
              <select
                required
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.project_title || 'Untitled'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label-text">Announcement Title</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Phase 1 Project Review Schedule Announced"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Message / Content</label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write the full announcement details, deadlines or guidelines..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModal({ isOpen: false, item: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={sending} className="btn-primary text-xs">
              {sending ? 'Saving...' : modal.item ? 'Update Announcement' : 'Broadcast Now'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
