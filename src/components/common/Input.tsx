import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  isLocked?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      isLocked = false,
      className = '',
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const lockedId = `${id}-locked`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
      isLocked ? lockedId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="text-[16px] font-bold text-[#232323] flex items-center justify-between"
        >
          <span>{label}</span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[14px] font-medium text-[#524E48]">
              <Lock className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
              Locked
            </span>
          )}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            aria-disabled={isLocked || disabled ? 'true' : undefined}
            readOnly={isLocked || readOnly}
            disabled={disabled}
            className={`w-full min-h-[52px] px-4 text-[18px] rounded-lg transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#A83B24] focus-visible:outline-offset-2 ${
              isLocked
                ? 'bg-[#EFECE4] border-[1.5px] border-dashed border-[#D6D1C7] text-[#524E48] cursor-not-allowed select-none'
                : error
                ? 'bg-white border-[1.5px] border-[#B91C1C] text-[#232323] focus:border-[#B91C1C]'
                : 'bg-white border-[1.5px] border-[#D6D1C7] text-[#232323] hover:border-[#0F5C5C]/50 focus:border-[#0F5C5C]'
            } ${className}`}
            {...props}
          />
        </div>

        {/* Error message in Alert Red with required prefix */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[15px] font-bold text-[#B91C1C] mt-0.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>
              <span className="font-bold">Error:</span> {error}
            </span>
          </p>
        )}

        {/* Locked field medical safety notice in neutral Warm Slate */}
        {isLocked && !error && (
          <p
            id={lockedId}
            className="text-[14px] text-[#524E48] italic mt-0.5"
          >
            Locked for medical safety. Delete and re-create to modify.
          </p>
        )}

        {/* Standard helper text */}
        {helperText && !error && !isLocked && (
          <p id={helperId} className="text-[14px] text-[#524E48] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

