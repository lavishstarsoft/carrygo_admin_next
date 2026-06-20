"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import MapsSetupHelp from "@/components/MapsSetupHelp";
import { backendUrl } from "@/utils/api";

export type FleetDriverPin = {
    _id: string;
    name?: string;
    phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
    latitude?: number | null;
    longitude?: number | null;
    ops_status?: string;
    average_rating?: number;
    total_deliveries?: number;
    location_updated_at?: string | null;
    active_trip?: {
        order_number?: string;
        status?: string;
        dropoff_address?: string;
        fare_total?: number;
        payment_status?: string;
    } | null;
    live_offer?: {
        order_number?: string;
        pickup_address?: string;
        dropoff_address?: string;
    } | null;
};

const MAP_CONTAINER = { width: "100%", height: "100%" };

const MARKER_COLORS: Record<string, string> = {
    idle: "#22c55e",      // green  → active / free
    on_trip: "#2563eb",   // blue   → on transit
    alert: "#f59e0b",     // amber  → alert ringing
    offline: "#ef4444",   // red    → inactive
    blocked: "#7f1d1d",   // dark red → blocked
};

const STATUS_LABELS: Record<string, string> = {
    idle: "Active / Free",
    on_trip: "On Transit",
    alert: "Alert Ringing",
    offline: "Inactive",
    blocked: "Blocked",
};

const DEFAULT_CENTER = { lat: 16.5062, lng: 80.6480 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const MAP_TYPE_OPTIONS: { id: google.maps.MapTypeId; label: string }[] = [
    { id: "roadmap" as google.maps.MapTypeId, label: "Map" },
    { id: "satellite" as google.maps.MapTypeId, label: "Satellite" },
    { id: "hybrid" as google.maps.MapTypeId, label: "Hybrid" },
    { id: "terrain" as google.maps.MapTypeId, label: "Terrain" },
];

type Props = {
    drivers: FleetDriverPin[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
};

const timeAgo = (value?: string | null) => {
    if (!value) return "no GPS yet";
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 0) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

function FleetStaticFallback({
    drivers,
    onError,
}: {
    drivers: FleetDriverPin[];
    onError?: (message: string) => void;
}) {
    const [failed, setFailed] = useState(false);
    const pins = drivers.filter(
        (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
    );

    const src = useMemo(() => {
        const points = pins.map((d) => ({
            lat: d.latitude,
            lng: d.longitude,
            ops_status: d.ops_status || "offline",
        }));
        const qs = new URLSearchParams({
            points: JSON.stringify(points),
            size: "900x400",
            zoom: pins.length <= 1 ? "14" : "12",
        });
        return `${backendUrl}/api/maps/fleet-static?${qs.toString()}`;
    }, [pins]);

    if (failed) {
        return (
            <MapsSetupHelp
                title="Static map also failed"
                detail="Usually billing not enabled or Maps Static API disabled on Google Cloud."
            />
        );
    }

    return (
        <div className="relative w-full h-full bg-slate-100">
            <img
                src={src}
                alt="Fleet map snapshot"
                className="w-full h-full object-cover"
                onError={async () => {
                    setFailed(true);
                    try {
                        const res = await fetch(src);
                        const data = await res.json().catch(() => null);
                        const detail = data?.detail || data?.error || "Static map request failed";
                        onError?.(detail);
                    } catch {
                        onError?.("Static map request failed");
                    }
                }}
            />
            <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 border border-slate-200">
                Static map mode — enable billing + Maps JavaScript API for interactive map
            </div>
        </div>
    );
}

function DriverInfoCard({ driver }: { driver: FleetDriverPin }) {
    const status = driver.ops_status || "offline";
    const color = MARKER_COLORS[status] || MARKER_COLORS.offline;
    const label = STATUS_LABELS[status] || "Inactive";
    const initial = (driver.name || driver.phone || "D").charAt(0).toUpperCase();

    return (
        <div className="w-[248px] font-sans overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {/* Status accent */}
            <div className="h-1" style={{ backgroundColor: color }} />

            {/* Header */}
            <div className="px-3.5 pt-3 pb-2.5 flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    {initial}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-slate-900 leading-tight truncate">
                        {driver.name || "Unnamed driver"}
                    </p>
                    {driver.phone ? (
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{driver.phone}</p>
                    ) : null}
                    <span
                        className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${color}18`, color }}
                    >
                        {label}
                    </span>
                </div>
            </div>

            {/* Details */}
            <div className="px-3.5 pb-3 space-y-2 border-t border-slate-100 pt-2.5">
                {(driver.vehicle_type || driver.vehicle_number) ? (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px] shrink-0">Vehicle</span>
                        <span className="font-bold text-slate-700 text-right truncate">
                            {[driver.vehicle_type, driver.vehicle_number].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                ) : null}

                {typeof driver.average_rating === "number" && driver.average_rating > 0 ? (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px] shrink-0">Rating</span>
                        <span className="font-bold text-amber-600">
                            {driver.average_rating.toFixed(1)} ★
                            {typeof driver.total_deliveries === "number" ? (
                                <span className="text-slate-400 font-semibold ml-1">· {driver.total_deliveries} trips</span>
                            ) : null}
                        </span>
                    </div>
                ) : null}

                {driver.active_trip ? (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                            On transit {driver.active_trip.order_number ? `#${driver.active_trip.order_number}` : ""}
                        </p>
                        {driver.active_trip.dropoff_address ? (
                            <p className="text-[10px] text-blue-900 mt-1 leading-snug line-clamp-2">
                                {driver.active_trip.dropoff_address}
                            </p>
                        ) : null}
                        <div className="flex items-center gap-2 mt-1.5">
                            {typeof driver.active_trip.fare_total === "number" ? (
                                <span className="text-[11px] font-black text-blue-700">
                                    ₹{driver.active_trip.fare_total}
                                </span>
                            ) : null}
                            {driver.active_trip.payment_status ? (
                                <span className="text-[9px] font-bold uppercase text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                                    {driver.active_trip.payment_status}
                                </span>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {!driver.active_trip && driver.live_offer ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">
                            Alert ringing {driver.live_offer.order_number ? `#${driver.live_offer.order_number}` : ""}
                        </p>
                        {driver.live_offer.pickup_address ? (
                            <p className="text-[10px] text-amber-900 mt-1 leading-snug line-clamp-2">
                                {driver.live_offer.pickup_address}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Last GPS</span>
                    <span className="text-[10px] font-bold text-slate-500">{timeAgo(driver.location_updated_at)}</span>
                </div>
            </div>
        </div>
    );
}

export default function FleetOpsMap({ drivers, selectedId, onSelect }: Props) {
    const mapRef = useRef<google.maps.Map | null>(null);
    const didInitialFit = useRef(false);
    const prevSelectedId = useRef<string | null>(null);
    const [staticError, setStaticError] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [mapType, setMapType] = useState<google.maps.MapTypeId>("roadmap" as google.maps.MapTypeId);
    const hoverTimer = useRef<number | null>(null);
    const { isLoaded, loadError, authFailed, apiKey } = useGoogleMaps();

    // Debounced hover so moving the cursor from a marker to its info card
    // does not flicker/blink the card off and on.
    const setHover = useCallback((id: string | null) => {
        if (hoverTimer.current) {
            window.clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
        if (id === null) {
            hoverTimer.current = window.setTimeout(() => setHoveredId(null), 180);
        } else {
            setHoveredId(id);
        }
    }, []);

    useEffect(() => () => {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    }, []);

    const pins = useMemo(
        () => drivers.filter(
            (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
        ),
        [drivers],
    );

    const fitToPins = useCallback(() => {
        const map = mapRef.current;
        if (!map || pins.length === 0) return;
        if (pins.length === 1) {
            map.setCenter({ lat: pins[0].latitude as number, lng: pins[0].longitude as number });
            map.setZoom(15);
            return;
        }
        const bounds = new google.maps.LatLngBounds();
        pins.forEach((p) => bounds.extend({ lat: p.latitude as number, lng: p.longitude as number }));
        map.fitBounds(bounds, 64);
    }, [pins]);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        if (!didInitialFit.current && pins.length > 0) {
            window.setTimeout(() => {
                fitToPins();
                didInitialFit.current = true;
            }, 100);
        }
    }, [fitToPins, pins.length]);

    // Pan only when admin explicitly picks a driver (table/marker click) — not on GPS ticks.
    useEffect(() => {
        if (selectedId === prevSelectedId.current) return;
        prevSelectedId.current = selectedId || null;

        const map = mapRef.current;
        if (!map || !selectedId) return;
        const sel = pins.find((p) => p._id === selectedId);
        if (sel?.latitude != null && sel.longitude != null) {
            map.panTo({ lat: sel.latitude as number, lng: sel.longitude as number });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;
        map.setMapTypeId(mapType);
        map.setOptions({
            styles: mapType === ("roadmap" as google.maps.MapTypeId) ? MAP_STYLES : [],
        });
    }, [mapType, isLoaded]);

    if (!apiKey) {
        return (
            <MapsSetupHelp
                title="Google Maps key missing"
                detail="Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in admin-panel/.env.local and restart npm run dev."
            />
        );
    }

    if (authFailed || loadError) {
        return (
            <div className="h-full flex flex-col min-h-[300px]">
                <div className="flex-1 min-h-0">
                    <FleetStaticFallback drivers={drivers} onError={setStaticError} />
                </div>
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-left shrink-0">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Interactive map unavailable</p>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Google Cloud lo <strong>billing enable</strong> cheyandi + <strong>Maps JavaScript API</strong> on cheyandi.
                        Referrer lo <code className="bg-white px-1 rounded">http://localhost:3000/*</code> add cheyandi.
                    </p>
                    {loadError?.message ? (
                        <p className="text-[10px] text-amber-700 mt-1 font-mono break-all">{loadError.message}</p>
                    ) : null}
                    {staticError ? (
                        <p className="text-[10px] text-amber-700 mt-1 font-mono break-all">{staticError}</p>
                    ) : null}
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-full relative bg-slate-100">
                <FleetStaticFallback drivers={drivers} onError={setStaticError} />
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                    <p className="text-sm text-slate-600 font-bold animate-pulse">Loading interactive map...</p>
                </div>
            </div>
        );
    }

    const activeId = hoveredId || selectedId || null;
    const activeDriver = activeId ? pins.find((p) => p._id === activeId) : null;

    return (
        <div className="relative w-full h-full fleet-map-root">
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER}
                center={DEFAULT_CENTER}
                zoom={12}
                onLoad={handleMapLoad}
                onUnmount={() => { mapRef.current = null; }}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    fullscreenControl: true,
                    gestureHandling: "greedy",
                    clickableIcons: false,
                    styles: MAP_STYLES,
                }}
            >
                {pins.map((driver) => {
                    const status = driver.ops_status || "offline";
                    const color = MARKER_COLORS[status] || MARKER_COLORS.offline;
                    const isSelected = selectedId === driver._id;
                    const isHovered = hoveredId === driver._id;
                    const isActive = isSelected || isHovered;
                    const isAlert = status === "alert";
                    return (
                        <Marker
                            key={driver._id}
                            position={{ lat: driver.latitude as number, lng: driver.longitude as number }}
                            onClick={() => onSelect?.(driver._id)}
                            onMouseOver={() => setHover(driver._id)}
                            onMouseOut={() => setHover(null)}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                fillColor: color,
                                // Keep geometry constant on hover to avoid edge flicker;
                                // only emphasise via fill opacity + stroke colour.
                                fillOpacity: isActive ? 1 : 0.88,
                                strokeColor: isActive ? "#0f172a" : "#ffffff",
                                strokeWeight: isSelected ? 3 : 2,
                                scale: isAlert ? 12 : (isSelected ? 11 : 9),
                            }}
                            zIndex={isAlert ? 300 : isActive ? 200 : 100}
                            animation={isAlert ? google.maps.Animation.BOUNCE : undefined}
                        />
                    );
                })}

                {activeDriver && activeDriver.latitude != null && activeDriver.longitude != null ? (
                    <InfoWindow
                        position={{ lat: activeDriver.latitude as number, lng: activeDriver.longitude as number }}
                        options={{
                            disableAutoPan: true,
                            pixelOffset: new google.maps.Size(0, -28),
                        }}
                        onCloseClick={() => setHover(null)}
                    >
                        <div
                            onMouseEnter={() => setHover(activeDriver._id)}
                            onMouseLeave={() => setHover(null)}
                        >
                            <DriverInfoCard driver={activeDriver} />
                        </div>
                    </InfoWindow>
                ) : null}
            </GoogleMap>

            {/* Map type switcher */}
            <div className="absolute top-3 right-3 flex rounded-lg bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 overflow-hidden">
                {MAP_TYPE_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMapType(opt.id)}
                        className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                            mapType === opt.id
                                ? "bg-slate-800 text-white"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Quick controls overlay */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => {
                        didInitialFit.current = true;
                        fitToPins();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-white hover:shadow-lg transition-all"
                >
                    Fit all drivers
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 text-[10px] font-black text-slate-600">
                    {pins.length} on map
                    {drivers.length - pins.length > 0 ? (
                        <span className="text-slate-400 font-bold"> · {drivers.length - pins.length} no GPS</span>
                    ) : null}
                </div>
            </div>

            {pins.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-md border border-slate-200 text-center">
                        <p className="text-xs font-black text-slate-700">No live GPS yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Drivers appear here once their app shares location.</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
