import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const WeightageMeter = ({ current, max = 100 }) => {
  const isPerfect = current === max;
  const isOver = current > max;
  
  const barColor = isPerfect ? 'bg-green-500' : 'bg-red-500';
  const textColor = isPerfect ? 'text-green-700' : 'text-red-700';
  const displayPercentage = Math.min(current, max);

  let message = `${current}% / ${max}%`;
  if (!isPerfect && current < max) message += ` — Need ${max - current}% more`;
  if (isOver) message += ` — Over by ${current - max}%`;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className={twMerge(clsx("text-sm font-medium", textColor))}>Weightage</span>
        <span className={twMerge(clsx("text-sm font-medium", textColor))}>{message}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={twMerge(clsx("h-2.5 rounded-full transition-all", barColor))} style={{ width: `${displayPercentage}%` }}></div>
      </div>
    </div>
  );
};
