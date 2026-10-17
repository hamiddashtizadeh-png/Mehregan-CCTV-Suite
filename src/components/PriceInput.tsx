import React, { useEffect, useState, useRef } from 'react';
import { formatWithCommas, parseNumberFromCommas } from '../utils/numberFormat';

export interface PriceInputProps {
  value: number;
  onChange: (numericValue: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  unit?: string; // e.g. "تومان" or "ریال"
  min?: number;
  max?: number;
  id?: string;
  autoFocus?: boolean;
}

/**
 * PriceInput: An input field that automatically adds 3-digit comma separators
 * as the user types, supports Persian numbers, and maintains correct numeric state.
 */
export const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  disabled = false,
  required = false,
  unit,
  min,
  max,
  id,
  autoFocus = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value ? formatWithCommas(value) : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal display if external value changes significantly
  useEffect(() => {
    const currentNum = parseNumberFromCommas(displayValue);
    if (currentNum !== value) {
      setDisplayValue(value ? formatWithCommas(value) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw.trim()) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const num = parseNumberFromCommas(raw);
    
    // Check boundary
    let clamped = num;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;

    const formatted = formatWithCommas(clamped);
    setDisplayValue(formatted);
    onChange(clamped);
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        dir="ltr"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className={`w-full text-left font-mono font-bold tracking-wider ${unit ? 'pl-14' : ''} ${className}`}
      />
      {unit && (
        <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 select-none pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
};
