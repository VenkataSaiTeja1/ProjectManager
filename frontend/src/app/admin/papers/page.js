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
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiFilter,
  FiExternalLink,
} from 'react-icons/fi';

export default function AdminPapersPage() {
  const [papers, setPapers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [modal, setModal] = useState({ isOpen: false, paper: null });
  const [formData, setFormData] = useState({
    team_id: '',
    title: '',
    venue_or_journal: '',
    submission_id: '',
    status: 'writing',
    status_date: new Date().toISOString().split('T')[0],
    plagiarism_percent: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAuxData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        api.get('/teams', { limit: 100 }),
        api.get('/batches'),
      ]);
      setTeams(tRes.data || []);
      setBatches(bRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/papers', {
        page,
        limit: 15,
        status: statusFilter || undefined,
        batch_id: batchFilter || undefined,
      });
      setPapers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [page, statusFilter, batchFilter]);

  const openCreateModal = () => {
    setModal({ isOpen: true, paper: null });
    setFormData({
      team_id: teams[0]?.id || '',
      title: '',
      venue_or_journal: '',
      submission_id: '',
      status: 'writing',
      status_date: new Date().toISOString().split('T')[0],
      plagiarism_percent: '',
      notes: '',
    });
  };

  const openEditModal = (p) => {
    setModal({ isOpen: true, paper: p });
    setFormData({
      team_id: p.team_id,
      title: p.title,
      venue_or_journal: p.venue_or_journal || '',
      submission_id: p.submission_id || '',
      status: p.status,
      status_date: p.status_date ? new Date(p.status_date).toISOString().split('T')[0] : '',
      plagiarism_percent: p.plagiarism_percent !== null ? p.plagiarism_percent : '',
      notes: p.notes || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        team_id: parseInt(formData.team_id, 10),
        plagiarism_percent: formData.plagiarism_percent ? parseFloat(formData.plagiarism_percent) : null,
      };

      if (modal.paper) {
        await api.put(`/papers/${modal.paper.id}`, payload);
        toast.success('Paper details updated');
      } else {
        await api.post('/papers', payload);
        toast.success('Paper entry added');
      }
      setModal({ isOpen: false, paper: null });
      fetchPapers();
    } catch (err) {
      toast.error(err.message || 'Error saving paper');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this paper entry?')) return;
    try {
      await api.delete(`/papers/${id}`);
      toast.success('Paper removed');
      fetchPapers();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Research Papers Monitoring</h1>
            <p className="text-sm text-gray-500">Track conference/journal submissions, reviews, plagiarism & publications</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 text-xs">
              <FiPlus className="w-4 h-4" />
              Add Paper
            </button>

            <ExcelExportBtn
              endpoint="/reports/papers"
              params={{ status: statusFilter, batch_id: batchFilter }}
              filename="research_papers_tracker.xlsx"
              label="Export Papers"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="">All Paper Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="writing">Drafting / Writing</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="published">Published</option>
          </select>

          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Papers Table */}
        {loading ? (
          <Loading text="Loading papers..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Paper Title</th>
                  <th className="py-3.5 px-6">Team</th>
                  <th className="py-3.5 px-6">Venue / Journal</th>
                  <th className="py-3.5 px-6">Submission ID</th>
                  <th className="py-3.5 px-6">Plagiarism</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {papers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                      No research papers tracked.
                    </td>
                  </tr>
                ) : (
                  papers.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 font-bold text-gray-900 max-w-sm">
                        <div className="flex items-center gap-2">
                          <FiFileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <span>{p.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-gray-700 font-semibold">{p.team_name}</td>
                      <td className="py-3.5 px-6 text-xs text-gray-600">{p.venue_or_journal || '—'}</td>
                      <td className="py-3.5 px-6 text-xs font-mono text-gray-500">{p.submission_id || '—'}</td>
                      <td className="py-3.5 px-6">
                        {p.plagiarism_percent !== null ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                              parseFloat(p.plagiarism_percent) > 15
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.plagiarism_percent}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge status={p.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100"
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

      {/* Add / Edit Paper Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, paper: null })}
        title={modal.paper ? 'Update Paper Record' : 'Record New Paper'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!modal.paper && (
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
                    {t.name} ({t.batch_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label-text">Paper Title</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Deep Learning Approaches to Edge Video Analytics"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Target Venue / Journal</label>
              <input
                value={formData.venue_or_journal}
                onChange={(e) => setFormData({ ...formData, venue_or_journal: e.target.value })}
                placeholder="e.g. IEEE ICACCS 2027"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Submission / Paper ID</label>
              <input
                value={formData.submission_id}
                onChange={(e) => setFormData({ ...formData, submission_id: e.target.value })}
                placeholder="e.g. #241"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="not_started">Not Started</option>
                <option value="writing">Writing / Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="label-text">Status Date</label>
              <input
                type="date"
                value={formData.status_date}
                onChange={(e) => setFormData({ ...formData, status_date: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text">Plagiarism %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.plagiarism_percent}
                onChange={(e) => setFormData({ ...formData, plagiarism_percent: e.target.value })}
                placeholder="e.g. 8.5"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Coordinator Notes & Reviewer Feedback</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Record review feedback, required camera-ready revisions, conference deadlines..."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModal({ isOpen: false, paper: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Paper'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
