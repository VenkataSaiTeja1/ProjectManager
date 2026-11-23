'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Loading from '@/components/ui/Loading';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiCalendar } from 'react-icons/fi';

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data || []);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Announcements & Notices</h1>
          <p className="text-sm text-gray-500">Official project communications from the project coordinator and college</p>
        </div>

        {loading ? (
          <Loading text="Loading notices..." />
        ) : (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="card text-center py-12 text-gray-400 text-sm">
                No active announcements for your batch or team.
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="card p-5 space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-bold text-base text-gray-900">{a.title}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {a.audience_type === 'all'
                        ? 'College-wide'
                        : a.audience_type === 'batch'
                        ? `Cohort: ${a.batch_name}`
                        : `Team: ${a.team_name}`}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{a.message}</p>

                  <div className="pt-2 text-[11px] text-gray-400 border-t border-gray-100 flex items-center justify-between">
                    <span>From: {a.created_by_name}</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
