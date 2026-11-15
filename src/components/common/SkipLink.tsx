import React from 'react';

/**
 * Accessible Skip-to-Content Link
 * Visually hidden until focused by keyboard tab navigation.
 */
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-3 focus:bg-[#0F5C5C] focus:text-white focus:font-bold focus:rounded-lg focus:shadow-lg focus:ring-4 focus:ring-[#A83B24]"
    >
      Skip to main content
    </a>
  );
};

