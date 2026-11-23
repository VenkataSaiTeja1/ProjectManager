'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiCalendar,
  FiUsers,
  FiFolder,
  FiFileText,
  FiMessageSquare,
  FiBookmark,
  FiPhoneCall,
  FiSun,
  FiShield,
  FiDownload,
  FiCheckSquare,
  FiUserCheck,
} from 'react-icons/fi';

export default function Sidebar({ user, onClose }) {
  const pathname = usePathname();

  const adminNav = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: FiGrid },
    { name: 'Daily Tracker', href: '/admin/daily-tracker', icon: FiCalendar },
    { name: 'Batches', href: '/admin/batches', icon: FiFolder },
    { name: 'Users & Guides', href: '/admin/users', icon: FiUsers },
    { name: 'Teams', href: '/admin/teams', icon: FiUserCheck },
    { name: 'Weekly Reviews', href: '/admin/reviews', icon: FiCheckSquare },
    { name: 'Announcements', href: '/admin/announcements', icon: FiMessageSquare },
    { name: 'Research Papers', href: '/admin/papers', icon: FiFileText },
    { name: 'Follow-ups', href: '/admin/followups', icon: FiPhoneCall },
    { name: 'Holidays', href: '/admin/holidays', icon: FiSun },
    { name: 'Audit Logs', href: '/admin/audit', icon: FiShield },
    { name: 'Reports & Exports', href: '/admin/reports', icon: FiDownload },
  ];

  const facultyNav = [
    { name: 'Dashboard', href: '/faculty/dashboard', icon: FiGrid },
    { name: 'Weekly Reviews', href: '/faculty/reviews', icon: FiCheckSquare },
  ];

  const studentNav = [
    { name: 'Dashboard', href: '/student/dashboard', icon: FiGrid },
    { name: 'Daily Update', href: '/student/daily-update', icon: FiCalendar },
    { name: 'Weekly Reviews', href: '/student/reviews', icon: FiCheckSquare },
    { name: 'Announcements', href: '/student/announcements', icon: FiMessageSquare },
    { name: 'My Team', href: '/student/team', icon: FiUsers },
  ];

  let navItems = studentNav;
  if (user?.role === 'admin') navItems = adminNav;
  if (user?.role === 'faculty') navItems = facultyNav;

  return (
    <aside className="w-64 flex flex-col flex-shrink-0 bg-white border-r border-gray-100 min-h-screen">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary-500/20">
            PM
          </div>
          <div>
            <span className="font-black text-base tracking-tight text-gray-900 block leading-tight">
              ProjectMonitor
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary-600">
              {user?.role || 'Portal'}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/faculty/dashboard' && item.href !== '/student/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {user?.role === 'student' && (
        <div className="p-4 m-3 bg-gradient-to-br from-primary-50 to-indigo-50/50 rounded-2xl border border-primary-100 text-center">
          <p className="text-xs font-semibold text-primary-900">Need Guidance?</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Check weekly reviews and connect with your faculty guide.
          </p>
        </div>
      )}

      <div className="p-4 border-t border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
          <p className="text-[11px] text-gray-500 truncate capitalize">{user?.role}</p>
        </div>
      </div>
    </aside>
  );
}
