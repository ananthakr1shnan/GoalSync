import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
    locked: { label: 'Locked', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    returned: { label: 'Returned', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    on_track: { label: 'On Track', color: 'bg-green-100 text-green-800 border-green-200' },
    not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={twMerge(clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border", config.color))}>
      {config.label}
    </span>
  );
};
