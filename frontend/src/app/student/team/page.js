'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiUsers, FiMail, FiPhone, FiCheckCircle } from 'react-icons/fi';

export default function StudentTeamPage() {
  const { team: userTeam } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/student');
      if (res.data?.team) {
        const fullTeamRes = await api.get(`/teams/${res.data.team.id}`);
        setTeam(fullTeamRes.data);
      }
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  if (loading) {
    return (
      <AppLayout requiredRole="student">
        <Loading text="Loading team profile..." />
      </AppLayout>
    );
  }

  if (!team) {
    return (
      <AppLayout requiredRole="student">
        <div className="card text-center py-12 text-sm text-gray-400">
          You are currently not enrolled in an active project team.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{team.name}</h1>
          <p className="text-sm text-gray-500">Project team composition, faculty guide & project scope</p>
        </div>

        {/* Project Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                {team.batch_name}
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                {team.project_title || 'Untitled Project'}
              </h2>
            </div>
            <Badge status={team.status} />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              Project Abstract / Scope
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {team.project_description || 'No project description added.'}
            </p>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-gray-500">Current Milestone Progress</span>
              <span className="text-primary-600 font-bold">{team.progress_percent || 0}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${team.progress_percent || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Faculty Guide Card */}
        <div className="card bg-purple-50/40 border-purple-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-lg">
            FG
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Assigned Faculty Guide
            </span>
            <h3 className="text-base font-bold text-gray-900">
              {team.guide_roll_number ? `[${team.guide_roll_number}] ` : ''}{team.guide_name || 'Unassigned'}
            </h3>
            {team.guide_email && <p className="text-xs text-gray-500 font-mono">{team.guide_email}</p>}
          </div>
        </div>

        {/* Members Roster */}
        <div className="card space-y-4">
          <h3 className="section-title">Team Members ({team.members?.length || 0})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {team.members?.map((m) => (
              <div key={m.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">
                    {m.roll_number ? `[${m.roll_number}] ` : ''}{m.name}
                  </span>
                  {m.is_lead && (
                    <span className="text-[10px] font-black uppercase bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      Team Lead
                    </span>
                  )}
                </div>
                {m.email && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiMail className="w-3.5 h-3.5" />
                    <span>{m.email}</span>
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                    <FiPhone className="w-3.5 h-3.5" />
                    <span>{m.phone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
