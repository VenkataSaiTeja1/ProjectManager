'use client';

import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function ExcelExportBtn({
  endpoint,
  params = {},
  filename = 'export.xlsx',
  label = 'Download Excel',
  className = '',
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await api.downloadExcel(endpoint, params, filename);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-60 ${className}`}
    >
      <FiDownload className={`w-4 h-4 ${loading ? 'animate-bounce' : ''}`} />
      <span>{loading ? 'Preparing...' : label}</span>
    </button>
  );
}
