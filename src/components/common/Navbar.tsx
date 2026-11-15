import React from 'react';
import { Logo } from './Logo';
import { Badge } from './Badge';

interface NavbarProps {
  currentMode?: 'assisted' | 'independent';
  userEmail?: string;
  userRole?: string;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode = 'assisted',
  userEmail,
  userRole,
  onSignOut,
}) => {
  return (
    <header className="w-full bg-[#FAF7F0] border-b border-[#D6D1C7] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#A83B24]"
            aria-label="Kinnect Home"
          >
            <Logo size={36} />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[22px] tracking-tight text-[#232323] leading-none">
                Kinnect
              </span>
              <span className="text-[12px] text-[#524E48] font-medium hidden sm:inline">
                Continuity of elderly care
              </span>
            </div>
          </a>
        </div>

        {/* Center / Right Mode Badge & User Session */}
        <div className="flex items-center gap-3 sm:gap-4">
          {currentMode === 'assisted' ? (
            <Badge variant="assisted">
              <span className="hidden xs:inline">Mode:</span> Assisted Care
            </Badge>
          ) : (
            <Badge variant="independent">
              <span className="hidden xs:inline">Mode:</span> Independent
            </Badge>
          )}

          {userEmail && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#D6D1C7]">
              <div className="flex flex-col text-right hidden md:flex">
                <span className="text-[14px] font-bold text-[#232323] truncate max-w-[150px]">
                  {userEmail}
                </span>
                <span className="text-[12px] text-[#524E48] capitalize">{userRole}</span>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-[15px] text-[#A83B24] hover:text-[#8A2F1B] font-bold underline px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A83B24]"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

