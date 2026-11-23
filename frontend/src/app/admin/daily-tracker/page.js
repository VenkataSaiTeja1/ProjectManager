'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiPhoneCall,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiSun,
  FiExternalLink,
  FiFilter,
} from 'react-icons/fi';

export default function DailyTrackerPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [trackerData, setTrackerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Follow-up modal state
  const [followupModal, setFollowupModal] = useState({ isOpen: false, team: null });
  const [followupNote, setFollowupNote] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTracker = async () => {
    try {
      setLoading(true);
      const res = await api.get('/daily-updates/tracker', {
        date,
        batch_id: selectedBatch || undefined,
      });
      setTrackerData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchTracker();
  }, [date, selectedBatch]);

  const handleLogFollowup = async (e) => {
    e.preventDefault();
    if (!followupNote.trim()) return;

    try {
      setSavingFollowup(true);
      await api.post('/followups', {
        team_id: followupModal.team.team_id,
        note: followupNote,
      });
      toast.success(`Follow-up saved for ${followupModal.team.team_name}`);
      setFollowupModal({ isOpen: false, team: null });
      setFollowupNote('');
    } catch (err) {
      toast.error(err.message || 'Failed to record follow-up');
    } finally {
      setSavingFollowup(false);
    }
  };

  const { summary, isHoliday, holidayReason, submitted, notSubmitted } = trackerData || {};

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Status Tracker</h1>
            <p className="text-sm text-gray-500">
              Live submission verification, late indicators & non-submission follow-up planner
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
              <FiCalendar className="text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-semibold text-gray-700 outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
              <FiFilter className="text-gray-400 w-4 h-4" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="text-sm font-semibold text-gray-700 outline-none bg-transparent"
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <ExcelExportBtn
              endpoint="/reports/daily-submissions"
              params={{ start_date: date, end_date: date, batch_id: selectedBatch }}
              filename={`daily_tracker_${date}.xlsx`}
              label="Export Today's Excel"
            />
          </div>
        </div>

        {/* Holiday Banner if Date is Holiday */}
        {isHoliday && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-purple-900">
            <FiSun className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Designated College Holiday ({date})</p>
              <p className="text-xs text-purple-700">{holidayReason} — Daily status update submission is excused today.</p>
            </div>
          </div>
        )}

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Total Teams</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{summary?.total || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FiCalendar className="w-5 h-5" />
            </div>
          </div>

          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Submitted</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary?.submitted || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <FiCheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Late Updates</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{summary?.late || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FiClock className="w-5 h-5" />
            </div>
          </div>

          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Not Submitted</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{summary?.notSubmitted || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <FiAlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {loading ? (
          <Loading text="Retrieving daily submissions..." />
        ) : (
          <div className="space-y-8">
            {/* Table 1: NOT SUBMITTED TEAMS */}
            <div className="card border-rose-100">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-rose-700 flex items-center gap-2">
                    <FiAlertCircle className="w-5 h-5" />
                    Pending / Not Submitted Teams ({notSubmitted?.length || 0})
                  </h2>
                  <p className="text-xs text-gray-500">
                    Teams that have not logged their status for {date}. Red color indicates extended missed days.
                  </p>
                </div>
              </div>

              {notSubmitted?.length === 0 ? (
                <p className="text-sm text-emerald-600 font-semibold py-4 text-center">
                  All active teams have submitted their updates for this date!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-rose-50/50 text-xs uppercase font-semibold text-gray-600 border-y border-rose-100">
                      <tr>
                        <th className="py-3 px-4">Team</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4">Faculty Guide</th>
                        <th className="py-3 px-4">Missed Days</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {notSubmitted?.map((t) => {
                        const missed = t.days_since_update !== null ? parseInt(t.days_since_update, 10) : 99;
                        const isSevere = missed >= 3;
                        const isModerate = missed === 2;

                        return (
                          <tr
                            key={t.team_id}
                            className={`transition-colors ${
                              isSevere
                                ? 'bg-rose-50/70 hover:bg-rose-50'
                                : isModerate
                                ? 'bg-amber-50/50 hover:bg-amber-50'
                                : 'hover:bg-gray-50/50'
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-gray-900">
                              <div>{t.team_name}</div>
                              <div className="text-xs text-gray-500 font-normal">{t.project_title || 'No title'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-800">
                                {t.lead_roll_number ? `[${t.lead_roll_number}] ` : ''}
                                {t.lead_name || 'Unassigned'}
                              </span>
                              {t.lead_phone && (
                                <div className="text-xs text-gray-500 font-mono">
                                  <a href={`tel:${t.lead_phone}`} className="hover:underline text-primary-600">
                                    {t.lead_phone}
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">
                              {t.guide_roll_number ? `[${t.guide_roll_number}] ` : ''}
                              {t.guide_name || 'Unassigned'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                                  isSevere
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : isModerate
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {missed === 99 ? 'No previous update' : `${missed} day${missed === 1 ? '' : 's'} missed`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setFollowupModal({ isOpen: true, team: t });
                                  setFollowupNote('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm transition-all"
                              >
                                <FiPhoneCall className="w-3.5 h-3.5 text-primary-600" />
                                Log Follow-up
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Table 2: SUBMITTED TEAMS */}
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-emerald-700 flex items-center gap-2">
                    <FiCheckCircle className="w-5 h-5" />
                    Submitted Teams ({submitted?.length || 0})
                  </h2>
                  <p className="text-xs text-gray-500">Teams that completed their daily status update for {date}.</p>
                </div>
              </div>

              {submitted?.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No submissions recorded for this date yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-600 border-y border-gray-100">
                      <tr>
                        <th className="py-3 px-4">Team</th>
                        <th className="py-3 px-4">Done Today</th>
                        <th className="py-3 px-4">Plan Tomorrow</th>
                        <th className="py-3 px-4">Blockers</th>
                        <th className="py-3 px-4">Progress</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {submitted?.map((t) => (
                        <tr key={t.team_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">
                            <div>{t.team_name}</div>
                            <div className="text-xs text-gray-500 font-normal">
                              Lead: {t.lead_roll_number ? `[${t.lead_roll_number}] ` : ''}{t.lead_name || 'Unassigned'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700 max-w-xs">{t.done_today}</td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs">{t.plan_tomorrow || '—'}</td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs">
                            {t.blockers ? (
                              <span className="text-rose-600 font-medium">{t.blockers}</span>
                            ) : (
                              'None'
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-800">{t.percent_complete}%</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {t.submitted_at
                              ? new Date(t.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {t.is_late ? (
                              <Badge status="late" text="Late" size="sm" />
                            ) : (
                              <Badge status="submitted" text="On-Time" size="sm" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Logging Modal */}
      <Modal
        isOpen={followupModal.isOpen}
        onClose={() => setFollowupModal({ isOpen: false, team: null })}
        title={`Log Follow-up Note: ${followupModal.team?.team_name}`}
      >
        <form onSubmit={handleLogFollowup} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1">
            <p><strong>Team Lead:</strong> {followupModal.team?.lead_name} ({followupModal.team?.lead_phone || 'No phone'})</p>
            <p><strong>Faculty Guide:</strong> {followupModal.team?.guide_name || 'Unassigned'}</p>
          </div>

          <div>
            <label className="label-text">Follow-up Call / Inquiry Notes</label>
            <textarea
              required
              rows={4}
              value={followupNote}
              onChange={(e) => setFollowupNote(e.target.value)}
              placeholder="e.g., Called team lead Arun; informed hardware module delay. Advised to post status with blocker."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFollowupModal({ isOpen: false, team: null })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingFollowup}
              className="btn-primary text-xs"
            >
              {savingFollowup ? 'Saving...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
