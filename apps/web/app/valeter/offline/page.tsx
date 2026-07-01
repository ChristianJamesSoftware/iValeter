"use client";

export default function ValeterOfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-offwhite px-6 text-center">
      <div className="rounded-full bg-amber-100 p-4">
        {/* wifi-off icon as inline SVG */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
      </div>
      <h1 className="text-xl font-bold text-navy">You&apos;re offline</h1>
      <p className="text-sm text-slate">Your jobs were saved when you last connected. Reconnect to sync any updates.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-[#01696F] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
