"use client";

import { trpc } from "@/lib/trpc/react";

/**
 * Partnership banner — shown on the customer dashboard.
 * Displays the dealership's brand logo and the Total Valeting logo
 * side-by-side with equal weight, endorsing the working relationship.
 * Hidden entirely if neither logo is configured.
 */
export function PartnershipBanner() {
  const { data, isLoading } = trpc.dealerships.getPartnershipLogos.useQuery();

  // Nothing to show until loaded, or if both logos are absent
  if (isLoading) return null;
  if (!data?.dealerLogoUrl && !data?.tvLogoUrl) return null;

  return (
    <div className="flex items-center justify-center gap-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      {/* Dealer logo half */}
      <div className="flex flex-1 items-center justify-center border-r border-line px-6 py-4">
        {data.dealerLogoUrl ? (
          <div className="relative h-14 w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.dealerLogoUrl}
              alt={data.dealerName ?? "Dealership logo"}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        ) : (
          <p className="text-sm font-semibold text-navy">{data.dealerName ?? "Dealership"}</p>
        )}
      </div>

      {/* Partnership divider */}
      <div className="flex flex-col items-center justify-center px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-offwhite">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-slate" aria-hidden="true">
            {/* handshake-style × icon for partnership */}
            <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate/60">
          In partnership
        </span>
      </div>

      {/* TV logo half */}
      <div className="flex flex-1 items-center justify-center border-l border-line px-6 py-4">
        {data.tvLogoUrl ? (
          <div className="relative h-14 w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.tvLogoUrl}
              alt="Total Valeting"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        ) : (
          <p className="text-sm font-semibold text-navy">Total Valeting</p>
        )}
      </div>
    </div>
  );
}
