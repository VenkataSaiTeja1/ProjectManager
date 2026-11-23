'use client';

export default function Loading({ text = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-gray-500">{text}</p>
    </div>
  );
}
