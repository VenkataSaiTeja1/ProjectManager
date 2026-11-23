'use client';

import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria.',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
        <FiInbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
