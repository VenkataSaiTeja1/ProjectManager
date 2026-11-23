'use client';

export default function Badge({ status, text, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const getColorClasses = (st) => {
    switch (st?.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'accepted':
      case 'published':
      case 'submitted':
      case 'seen':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'pending_review':
      case 'under_review':
      case 'writing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'needs_work':
      case 'rejected':
      case 'not_submitted':
      case 'late':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'holiday':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const displayText = text || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border capitalize ${sizeClasses} ${getColorClasses(status)}`}>
      {displayText}
    </span>
  );
}
