'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiUploadCloud,
  FiEye,
  FiEdit2,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiDownload,
  FiUsers,
} from 'react-icons/fi';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [teamModal, setTeamModal] = useState({ isOpen: false, isEditing: false, teamId: null });
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    batch_id: '',
    name: '',
    project_title: '',
    project_description: '',
    lead_id: '',
    guide_id: '',
    member_ids: [],
    status: 'active',
    progress_percent: 0,
  });
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchAuxData = async () => {
    try {
      const [bRes, fRes, sRes] = await Promise.all([
        api.get('/batches'),
        api.get('/users', { role: 'faculty', limit: 100 }),
        api.get('/users', { role: 'student', limit: 200 }),
      ]);
      setBatches(bRes.data || []);
      setFacultyList(fRes.data || []);
      setStudentsList(sRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teams', {
        page,
        limit: 15,
        search: search || undefined,
        batch_id: batchFilter || undefined,
        status: statusFilter || undefined,
      });
      setTeams(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [page, batchFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTeams();
  };

  const openCreateModal = () => {
    setTeamModal({ isOpen: true, isEditing: false, teamId: null });
    setFormData({
      batch_id: batches[0]?.id || '',
      name: '',
      project_title: '',
      project_description: '',
      lead_id: '',
      guide_id: '',
      member_ids: [],
      status: 'active',
      progress_percent: 0,
    });
  };

  const openEditModal = async (t) => {
    setTeamModal({ isOpen: true, isEditing: true, teamId: t.id });
    setFormData({
      batch_id: t.batch_id || '',
      name: t.name || '',
      project_title: t.project_title || '',
      project_description: t.project_description || '',
      lead_id: t.lead_id || '',
      guide_id: t.guide_id || '',
      member_ids: [],
      status: t.status || 'active',
      progress_percent: t.progress_percent || 0,
    });

    try {
      const res = await api.get(`/teams/${t.id}`);
      if (res.data) {
        setFormData({
          batch_id: res.data.batch_id || '',
          name: res.data.name || '',
          project_title: res.data.project_title || '',
          project_description: res.data.project_description || '',
          lead_id: res.data.lead_id || '',
          guide_id: res.data.guide_id || '',
          member_ids: res.data.members ? res.data.members.map(m => m.id.toString()) : [],
          status: res.data.status || 'active',
          progress_percent: res.data.progress_percent || 0,
        });
      }
    } catch (e) {
      console.error('Error fetching team members:', e);
    }
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        batch_id: parseInt(formData.batch_id, 10),
        name: formData.name,
        project_title: formData.project_title || null,
        project_description: formData.project_description || null,
        lead_id: formData.lead_id ? parseInt(formData.lead_id, 10) : null,
        guide_id: formData.guide_id ? parseInt(formData.guide_id, 10) : null,
        member_ids: formData.member_ids.map(id => parseInt(id, 10)),
        status: formData.status || 'active',
        progress_percent: parseInt(formData.progress_percent || 0, 10),
      };

      if (teamModal.isEditing) {
        await api.put(`/teams/${teamModal.teamId}`, payload);
        toast.success('Team and project updated successfully');
      } else {
        await api.post('/teams', payload);
        toast.success('Team created successfully');
      }
      setTeamModal({ isOpen: false, isEditing: false, teamId: null });
      fetchTeams();
    } catch (err) {
      toast.error(err.message || 'Error saving team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`Delete team "${name}"? All updates and reviews for this team will be permanently deleted.`)) return;
    try {
      await api.delete(`/teams/${id}`);
      toast.success('Team deleted');
      fetchTeams();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setImporting(true);
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.upload('/teams/bulk-import', fd);
      setImportResult(res.data);
      toast.success(`Teams import finished: ${res.data.successes.length} created.`);
      fetchTeams();
    } catch (err) {
      toast.error(err.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Teams Management</h1>
            <p className="text-sm text-gray-500">Configure team leads, faculty guides, members, project titles & monitor progress</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setImportModal(true);
                setImportResult(null);
                setImportFile(null);
              }}
              className="btn-secondary inline-flex items-center gap-2 text-xs"
            >
              <FiUploadCloud className="w-4 h-4 text-primary-600" />
              Bulk Import Teams
            </button>

            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              New Team
            </button>

            <ExcelExportBtn
              endpoint="/reports/team-progress"
              params={{ batch_id: batchFilter }}
              filename="team_progress_summary.xlsx"
              label="Export Teams"
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="card p-4 flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by team name or project title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-500"
              />
            </div>
            <button type="submit" className="btn-secondary text-xs">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
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

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_review">Pending Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Teams Table */}
        {loading ? (
          <Loading text="Loading teams..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Team & Project</th>
                  <th className="py-3.5 px-6">Batch</th>
                  <th className="py-3.5 px-6">Team Lead</th>
                  <th className="py-3.5 px-6">Faculty Guide</th>
                  <th className="py-3.5 px-6">Progress</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                      No teams match criteria.
                    </td>
                  </tr>
                ) : (
                  teams.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 font-bold text-gray-900">
                        <div>{t.name}</div>
                        <div className="text-xs text-gray-500 font-normal truncate max-w-xs">
                          {t.project_title ? (
                            <span className="text-gray-700 font-medium">{t.project_title}</span>
                          ) : (
                            <span className="text-amber-600 font-medium italic">No project title set (Click Edit to add)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-gray-600 font-medium">{t.batch_name}</td>
                      <td className="py-3.5 px-6 text-xs text-gray-800">
                        <span className="font-semibold">{t.lead_name || 'Unassigned'}</span>
                        <div className="text-primary-700 font-mono font-bold text-[11px] uppercase">{t.lead_roll_number || '—'}</div>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-gray-700 font-medium">
                        <div>{t.guide_name || 'Unassigned'}</div>
                        {t.guide_roll_number && (
                          <div className="text-gray-400 font-mono text-[10px]">{t.guide_roll_number}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-primary-600 h-1.5 rounded-full"
                              style={{ width: `${t.progress_percent || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{t.progress_percent || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge status={t.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-1">
                        <button
                          onClick={() => router.push(`/admin/teams/${t.id}`)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit Team & Project Details"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id, t.name)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Delete Team"
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

      {/* Create / Edit Team Modal */}
      <Modal
        isOpen={teamModal.isOpen}
        onClose={() => setTeamModal({ isOpen: false, isEditing: false, teamId: null })}
        title={teamModal.isEditing ? 'Edit Team & Project Details' : 'Create New Project Team'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="label-text">Team Name / Project Batch Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Batch 01 or Team Gamma"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Project Title / Project Name</label>
            <input
              value={formData.project_title}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="e.g. AI-driven Autonomous Rover (Can be edited anytime)"
              className="input-field font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="label-text">Project Abstract / Description</label>
            <textarea
              rows={3}
              value={formData.project_description}
              onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
              placeholder="Brief summary of project scope and objectives..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Team Lead (1 Student)</label>
              <select
                required
                value={formData.lead_id}
                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
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

            <div>
              <label className="label-text">Faculty Guide</label>
              <select
                value={formData.guide_id}
                onChange={(e) => setFormData({ ...formData, guide_id: e.target.value })}
                className="input-field"
              >
                <option value="">Assign Faculty Guide</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.roll_number ? `[${f.roll_number}] ` : ''}{f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Project Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="pending_review">Pending Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="label-text">Progress ({formData.progress_percent || 0}%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress_percent}
                onChange={(e) => setFormData({ ...formData, progress_percent: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Team Members (Hold Ctrl / Cmd to multi-select)</label>
            <select
              multiple
              size={4}
              value={formData.member_ids}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, member_ids: selected });
              }}
              className="input-field h-28"
            >
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roll_number ? `[${s.roll_number}] ` : ''}{s.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Selected lead is automatically enrolled as member.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTeamModal({ isOpen: false, isEditing: false, teamId: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : teamModal.isEditing ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Teams Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Bulk Import Teams (Excel / CSV)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
            <span>Download template for team and member assignments:</span>
            <button
              onClick={() => api.downloadExcel('/teams/template', {}, 'team_import_template.xlsx')}
              className="inline-flex items-center gap-1 font-bold text-primary-700 hover:underline"
            >
              <FiDownload className="w-3.5 h-3.5" />
              Download Template (.xlsx)
            </button>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                required
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Supported columns: team_name, batch_name, project_title, project_description, lead_email, guide_email, member_emails
              </p>
            </div>

            <button
              type="submit"
              disabled={importing || !importFile}
              className="w-full btn-primary text-xs"
            >
              {importing ? 'Processing File...' : 'Upload & Create Teams'}
            </button>
          </form>

          {importResult && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700">✓ {importResult.successes?.length || 0} Created</span>
                <span className="text-rose-700">✕ {importResult.errors?.length || 0} Errors</span>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-rose-50 p-3 rounded-xl border border-rose-100 divide-y divide-rose-100 text-xs">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="py-1 text-rose-800">
                      <strong>Row {err.row}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
