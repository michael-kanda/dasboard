// src/components/DateRangeSelector.tsx
'use client';

import React from 'react';

export type DateRangeOption = '30d' | '3m' | '6m' | '12m' | '18m' | '24m';

interface DateRangeSelectorProps {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
  className?: string;
}

const rangeLabels: Record<DateRangeOption, string> = {
  '30d': 'Letzte 30 Tage',
  '3m': 'Letzte 3 Monate',
  '6m': 'Letzte 6 Monate',
  '12m': 'Letzte 12 Monate',
  '18m': 'Letzte 18 Monate',
  '24m': 'Letzte 24 Monate',
};

export function getRangeLabel(range: DateRangeOption): string {
  return rangeLabels[range];
}

export default function DateRangeSelector({ 
  value, 
  onChange, 
  className = '' 
}: DateRangeSelectorProps) {
  const topRow: DateRangeOption[] = ['30d', '3m', '6m'];
  const bottomRow: DateRangeOption[] = ['12m', '18m', '24m'];

  const buttonClass = (option: DateRangeOption, row: DateRangeOption[], rowPosition: 'top' | 'bottom') => {
    const isFirst = option === row[0];
    const isLast = option === row[row.length - 1];

    const roundedClasses =
      rowPosition === 'top'
        ? `${isFirst ? 'rounded-tl-lg' : ''} ${isLast ? 'rounded-tr-lg' : ''}`
        : `${isFirst ? 'rounded-bl-lg' : ''} ${isLast ? 'rounded-br-lg' : ''}`;

    const activeClass =
      value === option
        ? 'bg-[#188BDB] text-white'
        : 'text-body hover:bg-surface-secondary';

    const borderLeft = !isFirst ? 'border-l border-theme-border-default' : '';

    return `px-3 py-1.5 text-xs font-medium transition-colors flex-1 ${roundedClasses} ${activeClass} ${borderLeft}`;
  };

  return (
    <div className={`inline-flex flex-col rounded-lg border border-theme-border-default bg-surface ${className}`}>
      {/* Zeile 1: 30 Tage, 3 Monate, 6 Monate */}
      <div className="flex">
        {topRow.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={buttonClass(option, topRow, 'top')}
          >
            {rangeLabels[option]}
          </button>
        ))}
      </div>

      {/* Trennlinie */}
      <div className="border-t border-theme-border-default" />

      {/* Zeile 2: 12 Monate, 18 Monate, 24 Monate */}
      <div className="flex">
        {bottomRow.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={buttonClass(option, bottomRow, 'bottom')}
          >
            {rangeLabels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
