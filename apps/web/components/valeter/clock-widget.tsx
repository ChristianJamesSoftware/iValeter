"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/react";
import { MapPin, MapPinOff, Clock, AlertTriangle, WifiOff } from "lucide-react";
import { enqueue } from "@/lib/offline-queue";

interface SiteGeo {
  lat: number | null;
  lng: number | null;
  radiusMetres: number;
  siteName: string;
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ClockWidget({ siteGeo }: { siteGeo: SiteGeo | null }) {
  const [now, setNow]             = useState(new Date());
  const [geoStatus, setGeoStatus] = useState<"checking" | "onsite" | "offsite" | "unavailable">("checking");
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [clockedIn, setClockedIn]   = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // "queued" = action saved offline, waiting for sync
  const [queuedState, setQueuedState] = useState<"none" | "queued-in" | "queued-out">("none");

  const utils = trpc.useUtils();

  const clockInMut = trpc.users.clockIn.useMutation({
    onSuccess: () => {
      setClockedIn(true);
      setClockInTime(new Date());
      setQueuedState("none");
      void utils.valeterTimesheets.myCurrentWeek.invalidate();
    },
  });
  const clockOutMut = trpc.users.clockOut.useMutation({
    onSuccess: () => {
      setClockedIn(false);
      setQueuedState("none");
      void utils.valeterTimesheets.myCurrentWeek.invalidate();
    },
  });

  // Tick clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Check geolocation
  const checkGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!siteGeo || siteGeo.lat === null || siteGeo.lng === null) {
          setGeoStatus("unavailable");
          return;
        }
        const dist = haversineMetres(pos.coords.latitude, pos.coords.longitude, siteGeo.lat, siteGeo.lng);
        setDistanceM(Math.round(dist));
        setGeoStatus(dist <= (siteGeo.radiusMetres || 200) ? "onsite" : "offsite");
      },
      () => setGeoStatus("unavailable"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [siteGeo]);

  useEffect(() => {
    checkGeo();
  }, [checkGeo]);

  // When we come back online, if there's a queued state the SW will replay it.
  // Update local UI immediately once we know it synced.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "QUEUE_REPLAYED") {
        if (queuedState === "queued-in") {
          setClockedIn(true);
          setClockInTime(new Date());
        } else if (queuedState === "queued-out") {
          setClockedIn(false);
        }
        setQueuedState("none");
        void utils.valeterTimesheets.myCurrentWeek.invalidate();
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [queuedState, utils]);

  const elapsed = clockInTime
    ? Math.floor((now.getTime() - clockInTime.getTime()) / 1000)
    : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  async function handleAction() {
    setActionLoading(true);
    const payload = geoCoords
      ? { lat: geoCoords.lat, lng: geoCoords.lng }
      : {};

    try {
      if (clockedIn) {
        await clockOutMut.mutateAsync(payload);
      } else {
        await clockInMut.mutateAsync(payload);
      }
    } catch {
      // Online attempt failed — check if we're offline
      if (!navigator.onLine) {
        // Queue it and give optimistic feedback
        const type = clockedIn ? "CLOCK_OUT" : "CLOCK_IN";
        await enqueue(type, payload);
        if (clockedIn) {
          // Optimistically show clocked out
          setClockedIn(false);
          setQueuedState("queued-out");
        } else {
          // Optimistically show clocked in
          setClockedIn(true);
          setClockInTime(new Date());
          setQueuedState("queued-in");
        }
      }
      // If online but errored, the mutation's error state handles it
    } finally {
      setActionLoading(false);
    }
  }

  const isQueued = queuedState !== "none";

  const geoIcon =
    geoStatus === "onsite" ? (
      <MapPin className="h-4 w-4 text-emerald-400" />
    ) : geoStatus === "offsite" ? (
      <MapPinOff className="h-4 w-4 text-amber-400" />
    ) : (
      <MapPin className="h-4 w-4 text-white/40" />
    );

  return (
    <div className="rounded-2xl bg-white/10 px-5 py-5">
      {/* Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
          <Clock className="h-3.5 w-3.5" />
          {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          {geoIcon}
          {geoStatus === "onsite" && <span className="text-emerald-400">On site</span>}
          {geoStatus === "offsite" && (
            <span className="text-amber-400">
              {distanceM !== null ? `${distanceM}m away` : "Off site"}
            </span>
          )}
          {geoStatus === "unavailable" && <span>Location unavailable</span>}
          {geoStatus === "checking" && <span>Checking location…</span>}
        </div>
      </div>

      {/* Off-site warning */}
      {geoStatus === "offsite" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/20 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          You appear to be off site. Your clock-in will be flagged for review.
        </div>
      )}

      {/* Queued offline notice */}
      {isQueued && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs text-white/70">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300" />
          Saved offline — will sync automatically when signal returns
        </div>
      )}

      {/* Elapsed timer */}
      {clockedIn && (
        <div className="mt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Time on site</p>
          <p className="mt-1 font-mono text-3xl font-black text-white">
            {hh}:{mm}:{ss}
          </p>
          {isQueued && (
            <p className="mt-0.5 text-[10px] text-amber-300">⏳ pending sync</p>
          )}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={() => void handleAction()}
        disabled={actionLoading}
        className={`mt-4 h-14 w-full rounded-xl text-base font-black tracking-wide transition-colors disabled:opacity-60 ${
          clockedIn
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-orange-500 text-white hover:bg-orange-600"
        }`}
      >
        {actionLoading ? "…" : clockedIn ? "Clock Out" : "Clock In"}
      </button>

      {siteGeo && (
        <p className="mt-2 text-center text-[10px] text-white/40">
          {siteGeo.siteName}
        </p>
      )}
    </div>
  );
}
