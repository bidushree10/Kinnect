import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const isError = toast.type === 'error';

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#0A4242]" strokeWidth={2.25} aria-hidden="true" />,
    error: <AlertCircle className="w-5 h-5 text-[#B91C1C]" strokeWidth={2.25} aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-[#0F5C5C]" strokeWidth={2.25} aria-hidden="true" />,
  };

  const bgStyles = {
    success: 'bg-[#E3EFEF] border border-[#0F5C5C] text-[#0A4242]',
    error: 'bg-[#FEE2E2] border border-[#B91C1C] text-[#B91C1C]',
    info: 'bg-[#F3EFE6] border border-[#D6D1C7] text-[#232323]',
  }[toast.type];

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`flex items-center justify-between gap-3 p-4 rounded-xl shadow-md min-w-[280px] max-w-md ${bgStyles}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="shrink-0">{icons[toast.type]}</span>
        <p className="text-[16px] font-bold">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss announcement"
        className="text-[#524E48] hover:text-[#232323] p-1 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A83B24]"
      >
        <X className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
};

