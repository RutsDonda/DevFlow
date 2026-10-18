import React from 'react';

/** Monochrome mark: three nodes feeding one hub – the supervisor and its agents. */
const Logo = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={`text-ink ${className}`} aria-hidden>
    <circle cx="16" cy="9" r="3.2" stroke="currentColor" strokeWidth="2" />
    <circle cx="7.5" cy="23" r="3.2" stroke="currentColor" strokeWidth="2" />
    <circle cx="24.5" cy="23" r="3.2" stroke="currentColor" strokeWidth="2" />
    <path d="M14.3 11.8 9.2 20.2M17.7 11.8l5.1 8.4M10.7 23h10.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default Logo;
