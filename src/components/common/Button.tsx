import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'large' | 'patient';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      fullWidth = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Sizing: minimum 56px for patient views, 48px standard
    const sizeClasses = {
      default: 'min-h-[48px] px-5 py-2.5 text-[18px]',
      large: 'min-h-[52px] px-6 py-3 text-[18px]',
      patient: 'min-h-[56px] px-6 py-3.5 text-[20px] font-bold',
    }[size];

    // Variants according to Kinnect UI Spec v2
    const variantClasses = {
      primary:
        'bg-[#0F5C5C] hover:bg-[#0A4242] text-white active:bg-[#073030] shadow-sm font-bold',
      secondary:
        'bg-transparent border-2 border-[#0F5C5C] text-[#0F5C5C] hover:bg-[#0F5C5C]/10 active:bg-[#0F5C5C]/20 font-bold',
      danger:
        'bg-[#B91C1C] hover:bg-[#991B1B] text-white active:bg-[#7F1D1D] font-bold',
      ghost:
        'bg-transparent hover:bg-[#D6D1C7]/30 text-[#232323] font-medium',
      link:
        'bg-transparent text-[#A83B24] hover:text-[#8A2F1B] underline underline-offset-4 font-bold p-0 min-h-0',
    }[variant];

    const widthClass = fullWidth ? 'w-full' : '';
    const disabledClass = disabled || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        className={`inline-flex items-center justify-center gap-2.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#A83B24] focus-visible:outline-offset-2 select-none ${sizeClasses} ${variantClasses} ${widthClass} ${disabledClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

