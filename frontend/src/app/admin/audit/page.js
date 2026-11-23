'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiShield, FiFilter, FiSearch } from 'react-icons/fi';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit', {
        page,
        limit: 20,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setLogs(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter, startDate, endDate]);

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Audit Log</h1>
          <p className="text-sm text-gray-500">Security and mutation history trail of all coordinator & user actions</p>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filter action (e.g. login, create)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
          />

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="">All Entities</option>
            <option value="users">Users</option>
            <option value="teams">Teams</option>
            <option value="batches">Batches</option>
            <option value="daily_updates">Daily Updates</option>
            <option value="weekly_reviews">Weekly Reviews</option>
            <option value="papers">Papers</option>
            <option value="followups">Follow-ups</option>
            <option value="holidays">Holidays</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded-lg outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Audit Table */}
        {loading ? (
          <Loading text="Loading audit records..." />
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6">Entity</th>
                  <th className="py-3.5 px-6">Entity ID</th>
                  <th className="py-3.5 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-sm text-gray-400">
                      No audit events match your filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-6 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-semibold text-xs text-gray-800">{l.user_name || 'System / Anonymous'}</div>
                        <div className="text-[10px] text-gray-400">{l.user_email}</div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-gray-100 text-gray-800">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-600 font-medium capitalize">{l.entity || '—'}</td>
                      <td className="py-3 px-6 text-xs font-mono text-gray-400">{l.entity_id || '—'}</td>
                      <td className="py-3 px-6 text-[11px] font-mono text-gray-600 max-w-xs truncate">
                        {l.details ? JSON.stringify(l.details) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

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
    </AppLayout>
  );
}
