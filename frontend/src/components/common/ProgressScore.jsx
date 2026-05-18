import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const ProgressScore = ({ score, size = 'md' }) => {
  const numericScore = Number(score) || 0;
  
  let colorClass = 'text-red-600 bg-red-100';
  if (numericScore >= 80) colorClass = 'text-green-600 bg-green-100';
  else if (numericScore >= 50) colorClass = 'text-amber-600 bg-amber-100';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2'
  };

  return (
    <span className={twMerge(clsx("inline-flex items-center font-bold rounded-full", colorClass, sizeClasses[size]))}>
      {numericScore}%
    </span>
  );
};
