'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiPhoneCall, FiSearch, FiTrash2, FiCalendar } from 'react-icons/fi';

export default function AdminFollowupsPage() {
  const [followups, setFollowups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState({
    team_id: '',
    note: '',
    called_on: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  const fetchAux = async () => {
    try {
      const res = await api.get('/teams', { limit: 100 });
      setTeams(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/followups', {
        page,
        limit: 15,
        search: search || undefined,
      });
      setFollowups(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load followups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAux();
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFollowups();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/followups', {
        team_id: parseInt(formData.team_id, 10),
        note: formData.note,
        called_on: formData.called_on,
      });
      toast.success('Follow-up logged successfully');
      setModal(false);
      setFormData({ team_id: '', note: '', called_on: new Date().toISOString().slice(0, 16) });
      fetchFollowups();
    } catch (err) {
      toast.error(err.message || 'Error saving follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up record?')) return;
    try {
      await api.delete(`/followups/${id}`);
      toast.success('Record deleted');
      fetchFollowups();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Coordinator Follow-ups Log</h1>
            <p className="text-sm text-gray-500">Audit trail of phone calls, inquiries and interventions for lagging teams</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setModal(true);
                setFormData({
                  team_id: teams[0]?.id || '',
                  note: '',
                  called_on: new Date().toISOString().slice(0, 16),
                });
              }}
              className="btn-primary inline-flex items-center gap-2 text-xs"
            >
              <FiPlus className="w-4 h-4" />
              Log Follow-up
            </button>

            <ExcelExportBtn
              endpoint="/reports/followups"
              filename="coordinator_followups_log.xlsx"
              label="Export Follow-ups"
            />
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notes or team name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-500"
              />
            </div>
            <button type="submit" className="btn-secondary text-xs">
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <Loading text="Loading follow-up records..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Date & Time</th>
                  <th className="py-3.5 px-6">Team</th>
                  <th className="py-3.5 px-6">Follow-up Notes / Reason</th>
                  <th className="py-3.5 px-6">Logged By</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followups.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-gray-400">
                      No follow-up calls logged yet.
                    </td>
                  </tr>
                ) : (
                  followups.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 text-xs font-mono text-gray-600 whitespace-nowrap">
                        {new Date(f.called_on).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-gray-900">{f.team_name}</td>
                      <td className="py-3.5 px-6 text-gray-700 text-xs leading-relaxed max-w-md">{f.note}</td>
                      <td className="py-3.5 px-6 text-xs text-gray-500">{f.created_by_name}</td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-semibold">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Record Coordinator Follow-up Call"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label-text">Select Lagging Team</label>
            <select
              required
              value={formData.team_id}
              onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Lead: {t.lead_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Contact Date & Time</label>
            <input
              type="datetime-local"
              required
              value={formData.called_on}
              onChange={(e) => setFormData({ ...formData, called_on: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Discussion Details / Reason for Inactivity</label>
            <textarea
              required
              rows={4}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g. Spoke with team lead; verified project kit arrived. Team will resume daily updates from tomorrow."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
