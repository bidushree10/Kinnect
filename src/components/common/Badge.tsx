import React from 'react';
import { Check, Clock, UserCheck, HeartHandshake } from 'lucide-react';

export type BadgeVariant = 'pending' | 'success' | 'assisted' | 'independent' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  className = '',
}) => {
  const defaultIcons = {
    pending: <Clock className="w-4 h-4 text-[#78350F]" strokeWidth={2.25} aria-hidden="true" />,
    success: <Check className="w-4 h-4 text-[#0A4242]" strokeWidth={2.5} aria-hidden="true" />,
    assisted: <HeartHandshake className="w-4 h-4 text-[#78350F]" strokeWidth={2.25} aria-hidden="true" />,
    independent: <UserCheck className="w-4 h-4 text-[#0A4242]" strokeWidth={2.25} aria-hidden="true" />,
    neutral: null,
  };

  const variantStyles = {
    pending: 'bg-[#FEF3C7] text-[#78350F] border-l-3 border-[#D97706] font-bold',
    success: 'bg-[#E3EFEF] text-[#0A4242] border border-[#0F5C5C] font-bold',
    assisted: 'bg-[#FEF3C7] text-[#78350F] border border-[#D97706]/40 font-bold',
    independent: 'bg-[#E3EFEF] text-[#0A4242] border border-[#0F5C5C]/40 font-bold',
    neutral: 'bg-[#F3EFE6] text-[#524E48] border border-[#D6D1C7] font-medium',
  }[variant];

  const renderedIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[15px] select-none ${variantStyles} ${className}`}
    >
      {renderedIcon && <span className="inline-flex shrink-0">{renderedIcon}</span>}
      <span>{children}</span>
    </span>
  );
};

