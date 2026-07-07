"use client";

/**
 * Mounts inside the admin layout and injects live badge counts into the
 * sidebar nav by finding the attendance link in the DOM and appending/
 * updating a badge span. This avoids converting DashboardShell to a
 * client component.
 */

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/react";

function setBadge(href: string, count: number) {
  const links = document.querySelectorAll<HTMLAnchorElement>(`a[href="${href}"]`);
  links.forEach((link) => {
    let badge = link.querySelector<HTMLSpanElement>("[data-nav-badge]");
    if (count > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.setAttribute("data-nav-badge", "true");
        // Match the Tailwind badge style from app-sidebar
        badge.style.cssText = [
          "margin-left:auto",
          "display:flex",
          "align-items:center",
          "justify-content:center",
          "min-width:20px",
          "height:20px",
          "border-radius:9999px",
          "background-color:#ef4444",
          "color:#ffffff",
          "font-size:10px",
          "font-weight:700",
          "padding:0 5px",
          "flex-shrink:0",
        ].join(";");
        link.appendChild(badge);
      }
      badge.textContent = count > 99 ? "99+" : String(count);
    } else if (badge) {
      badge.remove();
    }
  });
}

export function AdminNavBadgeOverlay() {
  const { data: counts } = trpc.timesheets.alertCounts.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: otRequests } = trpc.overtime.listPending.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const timesheetCount = counts?.total ?? 0;
  const otCount = otRequests?.length ?? 0;
  const attendanceBadge = timesheetCount + otCount;

  const prevRef = useRef(-1);

  useEffect(() => {
    if (prevRef.current === attendanceBadge) return;
    prevRef.current = attendanceBadge;
    setBadge("/admin/attendance", attendanceBadge);
  }, [attendanceBadge]);

  // Also clean up on unmount
  useEffect(() => {
    return () => setBadge("/admin/attendance", 0);
  }, []);

  return null;
}
