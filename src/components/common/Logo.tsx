import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Hand-coded Kinnect Logo Mark
 * Two interlocking rounded links that form a subtle heart and a protective bridge.
 * Colors: Forest Teal (#0F5C5C) and Coral (#C84B31), uniform 3px stroke, no gradients or shadows.
 */
export const Logo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Kinnect"
      className={className}
    >
      {/* Protective Teal Arch / Bridge (Family/Caretaker support) */}
      <path
        d="M6 21C6 13.82 11.373 8 18 8C24.627 8 30 13.82 30 21"
        stroke="#0F5C5C"
        strokeWidth="3.25"
        strokeLinecap="round"
      />
      {/* Warm Coral Heart Loop (Patient care connection) */}
      <path
        d="M11 20C11 25.5 18 29.5 18 29.5C18 29.5 25 25.5 25 20C25 16.5 22 15 19.5 17L18 18.5L16.5 17C14 15 11 16.5 11 20Z"
        stroke="#C84B31"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Interlocking Node */}
      <circle cx="18" cy="18.5" r="2" fill="#0F5C5C" />
    </svg>
  );
};

