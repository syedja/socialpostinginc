'use client';

export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="-12 -12 60 60"
      fill="none"
      role="img"
      aria-label="Social Posting Inc."
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <rect width="36" height="36" rx="10" fill="#1F4FD8" />
      <g stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(8 8) scale(0.833)">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4M8 14h3" />
      </g>
    </svg>
  );
};
