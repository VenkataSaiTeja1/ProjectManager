'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiUploadCloud,
  FiKey,
  FiUserX,
  FiSearch,
  FiFilter,
  FiFileText,
  FiDownload,
} from 'react-icons/fi';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [userModal, setUserModal] = useState({ isOpen: false, user: null });
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    batch_id: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        page,
        limit: 15,
        search: search || undefined,
        role: roleFilter || undefined,
        batch_id: batchFilter || undefined,
      });
      setUsers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, batchFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openCreateModal = () => {
    setUserModal({ isOpen: true, user: null });
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'student',
      batch_id: batches[0]?.id || '',
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        batch_id: formData.batch_id ? parseInt(formData.batch_id, 10) : null,
      };

      if (userModal.user) {
        await api.put(`/users/${userModal.user.id}`, payload);
        toast.success('User updated successfully');
      } else {
        const res = await api.post('/users', payload);
        toast.success('User created');
        if (res.data?.tempPassword) {
          setTempPasswordResult({ email: formData.email, tempPassword: res.data.tempPassword });
        }
      }
      setUserModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Error saving user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for ${user.name}? A temporary password will be generated.`)) return;
    try {
      const res = await api.post(`/users/${user.id}/reset-password`);
      setTempPasswordResult({ email: user.email, tempPassword: res.data.tempPassword });
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate user ${user.name}? They will not be able to log in.`)) return;
    try {
      await api.post(`/users/${user.id}/deactivate`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setImporting(true);
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.upload('/users/bulk-import', fd);
      setImportResult(res.data);
      toast.success(`Import complete: ${res.data.successes.length} added, ${res.data.errors.length} failed.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Users & Faculty Directory</h1>
            <p className="text-sm text-gray-500">Manage students, faculty guides and coordinator profiles</p>
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
              Bulk Import (Excel)
            </button>

            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2 text-xs"
            >
              <FiPlus className="w-4 h-4" />
              Add User
            </button>

            <ExcelExportBtn
              endpoint="/reports/users"
              params={{ role: roleFilter, batch_id: batchFilter }}
              filename="users_directory.xlsx"
              label="Export Excel"
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
                placeholder="Search by student/faculty name or email..."
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
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty Guides</option>
              <option value="admin">Admins</option>
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
        </div>

        {/* Table */}
        {loading ? (
          <Loading text="Loading user directory..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Cohort / Batch</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-sm text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 font-bold text-gray-900">{u.name}</td>
                      <td className="py-3.5 px-6 text-gray-600">{u.email}</td>
                      <td className="py-3.5 px-6 text-xs text-gray-500 font-mono">{u.phone || '—'}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'faculty'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-gray-600">{u.batch_name || '—'}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Reset temporary password"
                          className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FiKey className="w-4 h-4" />
                        </button>
                        {u.is_active && u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeactivate(u)}
                            title="Deactivate Account"
                            className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <FiUserX className="w-4 h-4" />
                          </button>
                        )}
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

      {/* Temp Password Dialog */}
      <Modal
        isOpen={Boolean(tempPasswordResult)}
        onClose={() => setTempPasswordResult(null)}
        title="Temporary Credentials Generated"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Please copy and share this temporary password with the user. They will be required to change it on their first login.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Email:</p>
            <p className="font-mono text-sm font-bold text-gray-900 mb-2">{tempPasswordResult?.email}</p>
            <p className="text-xs text-gray-500">Temporary Password:</p>
            <p className="font-mono text-base font-black text-primary-600 select-all">
              {tempPasswordResult?.tempPassword}
            </p>
          </div>
          <button
            onClick={() => setTempPasswordResult(null)}
            className="w-full btn-primary text-xs"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={userModal.isOpen}
        onClose={() => setUserModal({ isOpen: false, user: null })}
        title={userModal.user ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="label-text">Full Name</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Arun Patel"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="arun@student.edu"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Phone Number</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty Guide</option>
              <option value="admin">Project Coordinator (Admin)</option>
            </select>
          </div>

          {formData.role === 'student' && (
            <div>
              <label className="label-text">Batch</label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUserModal({ isOpen: false, user: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Bulk Import Users from Excel / CSV"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
            <span>Download pre-formatted import template:</span>
            <button
              onClick={() => api.downloadExcel('/users/template', {}, 'user_import_template.xlsx')}
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
                Supported columns: name, email, phone, role (faculty/student), batch_name
              </p>
            </div>

            <button
              type="submit"
              disabled={importing || !importFile}
              className="w-full btn-primary text-xs"
            >
              {importing ? 'Processing File...' : 'Upload & Import Rows'}
            </button>
          </form>

          {/* Row-level Error Report */}
          {importResult && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700">✓ {importResult.successes?.length || 0} Successful</span>
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
