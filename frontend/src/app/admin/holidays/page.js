'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiSun } from 'react-icons/fi';

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get('/holidays');
      setHolidays(res.data || []);
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/holidays', {
        holiday_date: holidayDate,
        reason,
      });
      toast.success('Holiday added');
      setModal(false);
      setHolidayDate('');
      setReason('');
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Error adding holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday entry?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      toast.success('Holiday removed');
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Designated Holidays Calendar</h1>
            <p className="text-sm text-gray-500">Dates on which daily status updates are waived for students</p>
          </div>

          <button
            onClick={() => setModal(true)}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>

        {loading ? (
          <Loading text="Loading holidays calendar..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Holiday Date</th>
                  <th className="py-3.5 px-6">Occasion / Reason</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-sm text-gray-400">
                      No holidays designated yet.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-6 font-bold text-gray-900 flex items-center gap-2">
                        <FiSun className="w-4 h-4 text-amber-500" />
                        {new Date(h.holiday_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-6 text-gray-700 font-medium">{h.reason}</td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleDelete(h.id)}
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
          </div>
        )}
      </div>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Add Holiday Date"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label-text">Date</label>
            <input
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Occasion / Reason</label>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. National Festival / Semester Break"
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
              {saving ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
