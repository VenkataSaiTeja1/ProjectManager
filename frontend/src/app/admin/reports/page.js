'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ExcelExportBtn from '@/components/ui/ExcelExportBtn';
import api from '@/lib/api';
import {
  FiDownload,
  FiCalendar,
  FiActivity,
  FiFileText,
  FiUsers,
  FiCheckSquare,
  FiPhoneCall,
  FiAward,
} from 'react-icons/fi';

export default function AdminReportsPage() {
  const [batches, setBatches] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [paperStatus, setPaperStatus] = useState('');

  useEffect(() => {
    api.get('/batches').then((res) => setBatches(res.data || [])).catch(() => {});
  }, []);

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Export & Reporting Center</h1>
          <p className="text-sm text-gray-500">
            Download comprehensive styled Excel reports (.xlsx) with auto-column width, headers & frozen title rows
          </p>
        </div>

        {/* Global Export Filter Bar */}
        <div className="card p-4 flex flex-wrap items-center gap-4 bg-primary-50/30 border-primary-100">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Batch Cohort</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
            />
          </div>
        </div>

        {/* 7 Report Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Report 1 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FiCalendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Daily Submissions Audit</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Complete daily log of all teams, submitted vs not submitted, late flags, blockers, done today & tomorrow&apos;s plan for date range.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/daily-submissions"
              params={{ start_date: startDate, end_date: endDate, batch_id: selectedBatch }}
              filename={`daily_submissions_${startDate}_${endDate}.xlsx`}
              label="Download Submissions Excel"
              className="w-full justify-center"
            />
          </div>

          {/* Report 2 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiActivity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Team Progress Summary</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Summary of team project titles, statuses, assigned guides, progress percentages, total submitted updates & last activity date.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/team-progress"
              params={{ batch_id: selectedBatch }}
              filename="team_progress_summary.xlsx"
              label="Download Progress Excel"
              className="w-full justify-center"
            />
          </div>

          {/* Report 3 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FiFileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Research Papers Report</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Paper titles, submission IDs, venues, review stages (writing, submitted, accepted, published), plagiarism percentages and notes.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/papers"
              params={{ batch_id: selectedBatch, status: paperStatus }}
              filename="research_papers_report.xlsx"
              label="Download Papers Excel"
              className="w-full justify-center"
            />
          </div>

          {/* Report 4 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FiCheckSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Weekly Reviews & Guidance</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Weekly review suggestions, milestone dates, seen acknowledgment counters, attachment links and coordinator feedback.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/reviews"
              params={{ batch_id: selectedBatch }}
              filename="weekly_reviews_summary.xlsx"
              label="Download Reviews Excel"
              className="w-full justify-center"
            />
          </div>

          {/* Report 5 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiUsers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Users, Teams & Guide Roster</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Complete roster of faculty guides, students, team assignments, contact phones and account active statuses.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/users"
              params={{ batch_id: selectedBatch }}
              filename="users_and_guide_roster.xlsx"
              label="Download Roster Excel"
              className="w-full justify-center"
            />
          </div>

          {/* Report 6 */}
          <div className="card flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FiPhoneCall className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Coordinator Follow-ups Log</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Log of phone calls, inquiries and interventions for lagging teams with timestamps and logged coordinator notes.
              </p>
            </div>
            <ExcelExportBtn
              endpoint="/reports/followups"
              params={{}}
              filename="coordinator_followups_log.xlsx"
              label="Download Follow-ups Excel"
              className="w-full justify-center"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
