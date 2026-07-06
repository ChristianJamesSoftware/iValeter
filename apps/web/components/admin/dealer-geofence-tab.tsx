"use client";

/**
 * DealerGeofenceTab
 * -----------------
 * Per-site geofencing editor for the admin dealership detail page.
 *
 * Features:
 *  - Postcode → geocode via postcodes.io (free, no API key required)
 *  - Leaflet.js interactive map loaded via CDN (no npm package, avoids SSR issues)
 *  - Draggable marker — drop it on the exact site entrance
 *  - Radius slider 50 m – 1000 m (default 200 m)
 *  - Live circle preview on the map
 *  - Save / Clear geofence per site
 *  - Status badge: ✅ Set / ⚠️ Not configured
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Search, Trash2, Save, Navigation } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteGeoRow {
  id: string;
  name: string;
  address: string | null;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadiusMetres: number | null;
}

interface Props {
  sites: SiteGeoRow[];
  dealershipId: string;
  onSaved: () => void;
}

// ── Leaflet singleton helpers (loaded once from CDN) ──────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
    _leafletLoaded?: boolean;
  }
}

function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window._leafletLoaded) return Promise.resolve();

  return new Promise((resolve) => {
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      window._leafletLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ── Postcodes.io helper ───────────────────────────────────────────────────────

async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const clean = postcode.replace(/\s+/g, "").toUpperCase();
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
  if (!res.ok) return null;
  const data = await res.json() as { status: number; result?: { latitude: number; longitude: number; postcode: string } };
  if (data.status !== 200 || !data.result) return null;
  return { lat: data.result.latitude, lng: data.result.longitude, label: data.result.postcode };
}

// ── Map Editor (per-site) ─────────────────────────────────────────────────────

interface EditorProps {
  site: SiteGeoRow;
  onSaved: () => void;
}

const DEFAULT_UK_LAT = 51.505;
const DEFAULT_UK_LNG = -0.09;
const DEFAULT_RADIUS = 200;

function SiteGeofenceEditor({ site, onSaved }: EditorProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);

  const [lat, setLat]     = useState<number>(site.geofenceLat ?? DEFAULT_UK_LAT);
  const [lng, setLng]     = useState<number>(site.geofenceLng ?? DEFAULT_UK_LNG);
  const [radius, setRadius] = useState<number>(site.geofenceRadiusMetres ?? DEFAULT_RADIUS);
  const [hasPin, setHasPin] = useState<boolean>(site.geofenceLat != null);

  const [postcode, setPostcode]   = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError]   = useState("");
  const [mapReady, setMapReady]   = useState(false);

  const utils = trpc.useUtils();
  const setGeofence = trpc.sites.setGeofence.useMutation({
    onSuccess: () => { void utils.dealerships.getById.invalidate(); onSaved(); },
  });
  const clearGeofence = trpc.sites.clearGeofence.useMutation({
    onSuccess: () => {
      setHasPin(false);
      setLat(DEFAULT_UK_LAT);
      setLng(DEFAULT_UK_LNG);
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current && mapRef.current) {
        mapRef.current.removeLayer(circleRef.current);
        circleRef.current = null;
      }
      void utils.dealerships.getById.invalidate();
      onSaved();
    },
  });

  // ── Update circle when radius changes ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !circleRef.current) return;
    circleRef.current.setRadius(radius);
  }, [radius, mapReady]);

  // ── Place or move pin ──────────────────────────────────────────────────────
  const placePin = useCallback((newLat: number, newLng: number) => {
    if (!mapRef.current) return;
    const L = window.L;
    setLat(newLat);
    setLng(newLng);
    setHasPin(true);

    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    } else {
      markerRef.current = L.marker([newLat, newLng], { draggable: true })
        .addTo(mapRef.current)
        .bindTooltip("Drag to refine", { permanent: false });

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        if (circleRef.current) circleRef.current.setLatLng([pos.lat, pos.lng]);
      });
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([newLat, newLng]);
    } else {
      circleRef.current = L.circle([newLat, newLng], {
        radius,
        color: "#E8650A",
        fillColor: "#E8650A",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(mapRef.current);
    }

    mapRef.current.setView([newLat, newLng], 17);
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      if (cancelled || !mapElRef.current) return;
      if (mapRef.current) return; // already initialised

      const L = window.L;
      const initLat = site.geofenceLat ?? DEFAULT_UK_LAT;
      const initLng = site.geofenceLng ?? DEFAULT_UK_LNG;
      const zoom    = site.geofenceLat != null ? 17 : 6;

      mapRef.current = L.map(mapElRef.current, { zoomControl: true }).setView([initLat, initLng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Click to place pin
      mapRef.current.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        placePin(e.latlng.lat, e.latlng.lng);
      });

      // Restore existing pin
      if (site.geofenceLat != null && site.geofenceLng != null) {
        placePin(site.geofenceLat, site.geofenceLng);
      }

      setMapReady(true);
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Geocode postcode ───────────────────────────────────────────────────────
  async function handleGeocode() {
    if (!postcode.trim()) return;
    setGeocoding(true);
    setGeoError("");
    const result = await geocodePostcode(postcode.trim());
    setGeocoding(false);
    if (!result) {
      setGeoError("Postcode not found — check and try again");
      return;
    }
    placePin(result.lat, result.lng);
  }

  const isSet = site.geofenceLat != null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            isSet ? "bg-emerald-50" : "bg-amber-50",
          )}>
            {isSet
              ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              : <AlertTriangle className="h-4 w-4 text-amber-500" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{site.name}</p>
            {site.address && <p className="text-xs text-slate-400">{site.address}</p>}
          </div>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
          isSet
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-amber-50 text-amber-700 border border-amber-100",
        )}>
          {isSet ? `${site.geofenceRadiusMetres ?? DEFAULT_RADIUS}m radius` : "Not configured"}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Postcode geocode */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Jump to postcode
          </label>
          <div className="flex gap-2">
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleGeocode(); }}
              placeholder="e.g. SN1 3LU"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <button
              onClick={() => void handleGeocode()}
              disabled={geocoding || !postcode.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Locate
            </button>
          </div>
          {geoError && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {geoError}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-slate-400">
            Then drag the pin to the exact site entrance
          </p>
        </div>

        {/* Map */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height: 320 }}>
          <div ref={mapElRef} style={{ height: "100%", width: "100%" }} />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}
          {mapReady && !hasPin && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm pointer-events-none">
              Click the map or enter a postcode to place the pin
            </div>
          )}
        </div>

        {/* Radius slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Geofence radius
            </label>
            <span className="text-sm font-semibold text-slate-900">{radius} m</span>
          </div>
          <input
            type="range"
            min={50}
            max={1000}
            step={25}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>50 m</span>
            <span className="text-center">200 m typical</span>
            <span>1000 m</span>
          </div>
        </div>

        {/* Coordinates display */}
        {hasPin && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 flex items-center gap-2">
            <Navigation className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex gap-4 text-xs font-mono text-slate-600">
              <span>Lat <span className="text-slate-900 font-semibold">{lat.toFixed(6)}</span></span>
              <span>Lng <span className="text-slate-900 font-semibold">{lng.toFixed(6)}</span></span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setGeofence.mutate({ id: site.id, lat, lng, radiusMetres: radius })}
            disabled={!hasPin || setGeofence.isPending}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            {setGeofence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save geofence
          </button>

          {isSet && (
            <button
              onClick={() => clearGeofence.mutate({ id: site.id })}
              disabled={clearGeofence.isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors"
            >
              {clearGeofence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear
            </button>
          )}

          {setGeofence.isSuccess && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DealerGeofenceTab({ sites, dealershipId, onSaved }: Props) {
  const configuredCount = sites.filter((s) => s.geofenceLat != null).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {configuredCount} of {sites.length} site{sites.length !== 1 ? "s" : ""} configured
          </p>
          <p className="text-xs text-slate-500">
            The geofence is a soft boundary — valeters outside the zone are flagged, not blocked.
            Drag the pin to the exact site entrance for best accuracy.
          </p>
        </div>
      </div>

      {/* One editor card per site */}
      {sites.map((site) => (
        <SiteGeofenceEditor key={site.id} site={site} onSaved={onSaved} />
      ))}

      {sites.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">No sites on this dealership yet</p>
          <p className="text-xs text-slate-400 mt-1">Add a site first from the Overview tab</p>
        </div>
      )}
    </div>
  );
}
