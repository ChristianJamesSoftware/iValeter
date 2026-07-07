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
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [missedClockOut, setMissedClockOut] = useState<{ at: number } | null>(null);

  // Check for a previously dropped clock-out (payroll risk warning)
  useEffect(() => {
    try {
      const flag = localStorage.getItem("ivaleter:missed_clockout");
      if (flag) {
        setMissedClockOut(JSON.parse(flag) as { at: number });
      }
    } catch { /* ignore */ }
  }, []);

  const utils = trpc.useUtils();

  // Load today's clock status from DB on mount — persists across navigation
  const { data: clockStatus } = trpc.users.myClockStatus.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (clockStatus === undefined) return;
    setClockedIn(clockStatus.clockedIn);
    if (clockStatus.clockedInAt) setClockInTime(new Date(clockStatus.clockedInAt));
    setStatusLoaded(true);
  }, [clockStatus]);

  const clockInMut = trpc.users.clockIn.useMutation({
    onSuccess: () => {
      setClockedIn(true);
      setClockInTime(new Date());
      setQueuedState("none");
      void utils.users.myClockStatus.invalidate();
      void utils.valeterTimesheets.myCurrentWeek.invalidate();
    },
  });
  const clockOutMut = trpc.users.clockOut.useMutation({
    onSuccess: () => {
      setClockedIn(false);
      setClockInTime(null); // stop the elapsed timer
      setQueuedState("none");
      void utils.users.myClockStatus.invalidate();
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

    // Check offline BEFORE attempting — avoids waiting for a fetch timeout
    if (!navigator.onLine) {
      const type = clockedIn ? "CLOCK_OUT" : "CLOCK_IN";
      await enqueue(type, payload);
      if (clockedIn) {
        setClockedIn(false);
        setClockInTime(null);  // stop the timer immediately
        setQueuedState("queued-out");
      } else {
        setClockedIn(true);
        setClockInTime(new Date());
        setQueuedState("queued-in");
      }
      setActionLoading(false);
      return;
    }

    try {
      if (clockedIn) {
        await clockOutMut.mutateAsync(payload);
        setClockInTime(null); // stop the timer on successful clock-out
      } else {
        await clockInMut.mutateAsync(payload);
      }
    } catch {
      // Online but request failed — queue it as a fallback
      const type = clockedIn ? "CLOCK_OUT" : "CLOCK_IN";
      await enqueue(type, payload);
      if (clockedIn) {
        setClockedIn(false);
        setClockInTime(null);  // stop the timer
        setQueuedState("queued-out");
      } else {
        setClockedIn(true);
        setClockInTime(new Date());
        setQueuedState("queued-in");
      }
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
          {geoStatus === "unavailable" && <span className="text-white/40">No location</span>}
          {geoStatus === "checking" && <span className="text-white/40">Checking…</span>}
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

      {/* Missed clock-out warning */}
      {missedClockOut && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-500/20 px-3 py-2.5 text-xs text-red-200">
          <p className="font-bold">⚠ Clock-out not recorded</p>
          <p className="mt-0.5 opacity-80">
            A clock-out at {new Date(missedClockOut.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} could not be synced after multiple attempts. Please let your manager know so your timesheet can be corrected.
          </p>
          <button
            onClick={() => { localStorage.removeItem("ivaleter:missed_clockout"); setMissedClockOut(null); }}
            className="mt-1.5 text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={() => void handleAction()}
        disabled={actionLoading || !statusLoaded}
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
