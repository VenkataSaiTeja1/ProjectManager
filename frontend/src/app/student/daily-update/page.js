'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiZap,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiLink,
  FiSend,
} from 'react-icons/fi';

export default function StudentDailyUpdatePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [doneToday, setDoneToday] = useState('');
  const [planTomorrow, setPlanTomorrow] = useState('');
  const [blockers, setBlockers] = useState('');
  const [percentComplete, setPercentComplete] = useState(10);
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMyUpdate = async () => {
    try {
      setLoading(true);
      const res = await api.get('/daily-updates/my-update');
      setData(res.data);

      if (res.data.update) {
        setDoneToday(res.data.update.done_today || '');
        setPlanTomorrow(res.data.update.plan_tomorrow || '');
        setBlockers(res.data.update.blockers || '');
        setPercentComplete(res.data.update.percent_complete || 10);
        setLink(res.data.update.link || '');
      }
    } catch (err) {
      toast.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyUpdate();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/daily-updates/submit', {
        done_today: doneToday,
        plan_tomorrow: planTomorrow || null,
        blockers: blockers || null,
        percent_complete: parseInt(percentComplete, 10),
        link: link || null,
      });

      toast.success(res.message || 'Status update saved!');
      fetchMyUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout requiredRole="student">
        <Loading text="Loading daily status update..." />
      </AppLayout>
    );
  }

  const { update, isLead, streak = 0, recentUpdates = [] } = data || {};

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Project Status Update</h1>
            <p className="text-sm text-gray-500">Record daily development milestones, blockers & tomorrow&apos;s sprint plan</p>
          </div>

          {/* Submission Streak Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-md shadow-orange-500/20">
            <FiZap className="w-5 h-5 fill-current" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-90">Current Streak</span>
              <span className="text-sm font-black">{streak} Day{streak === 1 ? '' : 's'} Active</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!isLead ? (
              <div className="card text-center py-12 space-y-3">
                <FiClock className="w-10 h-10 text-primary-500 mx-auto" />
                <h3 className="font-bold text-base text-gray-800">Team Member View</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Only your designated Team Lead can submit and edit the team&apos;s daily project update. You can view all submissions and coordinator feedback below.
                </p>
              </div>
            ) : (
              <div className="card space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="font-bold text-base text-gray-900">
                      {update ? 'Edit Today\'s Submission' : 'Submit Today\'s Update'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      Submissions are accepted until midnight and flagged &apos;Late&apos; after 8:00 PM.
                    </p>
                  </div>
                  {update && (
                    <Badge status={update.is_late ? 'late' : 'submitted'} size="sm" />
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label-text">
                      What was done today? <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={doneToday}
                      onChange={(e) => setDoneToday(e.target.value)}
                      placeholder="e.g., Implemented JWT authentication and role-based middleware in Express..."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="label-text">Plan for tomorrow</label>
                    <textarea
                      rows={2}
                      value={planTomorrow}
                      onChange={(e) => setPlanTomorrow(e.target.value)}
                      placeholder="e.g., Integrate frontend auth context and implement route protection..."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="label-text">Blockers / Challenges (if any)</label>
                    <input
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      placeholder="e.g., Waiting for database credentials from faculty guide..."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label-text mb-0">Project Overall Progress (%)</label>
                      <span className="text-sm font-black text-primary-600">{percentComplete}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={percentComplete}
                      onChange={(e) => setPercentComplete(e.target.value)}
                      className="w-full accent-primary-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="label-text">Code Repository / Demo Link (Optional)</label>
                    <div className="relative">
                      <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://github.com/..."
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
                    >
                      <FiSend className="w-4 h-4" />
                      <span>{submitting ? 'Submitting...' : update ? 'Update Today\'s Entry' : 'Submit Update'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Submission Guidelines & Recent history */}
          <div className="space-y-4">
            <div className="card bg-blue-50/50 border-blue-100 p-5 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <FiClock className="w-4 h-4 text-blue-600" />
                Submission Guidelines
              </h3>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Submit daily before <strong>8:00 PM</strong>.</li>
                <li>Updates submitted between 8:00 PM and midnight are marked <strong>Late</strong>.</li>
                <li>Locked at midnight — retroactive edits not permitted.</li>
                <li>Designated college holidays are automatically excused.</li>
              </ul>
            </div>

            {/* Previous 7 Updates */}
            <div className="card space-y-3">
              <h3 className="section-title">Past Updates History</h3>
              {recentUpdates.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No previous updates logged.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentUpdates.map((u) => (
                    <div key={u.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          {new Date(u.update_date).toLocaleDateString()}
                        </span>
                        {u.is_late && <Badge status="late" text="Late" size="sm" />}
                      </div>
                      <p className="text-gray-700">{u.done_today}</p>
                      {u.blockers && <p className="text-rose-600 font-medium">Blocker: {u.blockers}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
