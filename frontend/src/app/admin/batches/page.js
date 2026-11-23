'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiFolder } from 'react-icons/fi';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, batch: null });
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/batches');
      setBatches(res.data || []);
    } catch (err) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openCreateModal = () => {
    setModal({ isOpen: true, batch: null });
    setName('');
    setAcademicYear('2026-2027');
  };

  const openEditModal = (b) => {
    setModal({ isOpen: true, batch: b });
    setName(b.name);
    setAcademicYear(b.academic_year);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (modal.batch) {
        await api.put(`/batches/${modal.batch.id}`, { name, academic_year: academicYear });
        toast.success('Batch updated');
      } else {
        await api.post('/batches', { name, academic_year: academicYear });
        toast.success('Batch created');
      }
      setModal({ isOpen: false, batch: null });
      fetchBatches();
    } catch (err) {
      toast.error(err.message || 'Error saving batch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch? All associated teams may be removed.')) return;
    try {
      await api.delete(`/batches/${id}`);
      toast.success('Batch deleted');
      fetchBatches();
    } catch (err) {
      toast.error(err.message || 'Failed to delete batch');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Academic Batches</h1>
            <p className="text-sm text-gray-500">Manage student cohort years and active academic groups</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
            <FiPlus className="w-4 h-4" />
            Add Batch
          </button>
        </div>

        {loading ? (
          <Loading text="Loading batches..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Batch Name</th>
                  <th className="py-3.5 px-6">Academic Year</th>
                  <th className="py-3.5 px-6">Created On</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-sm text-gray-400">
                      No batches added yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="py-4 px-6 font-bold text-gray-900 flex items-center gap-2">
                        <FiFolder className="w-4 h-4 text-primary-500" />
                        {b.name}
                      </td>
                      <td className="py-4 px-6 text-gray-700 font-medium">{b.academic_year}</td>
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, batch: null })}
        title={modal.batch ? 'Edit Batch' : 'Create New Batch'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-text">Batch Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2027 Batch"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Academic Year</label>
            <input
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2026-2027"
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModal({ isOpen: false, batch: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
