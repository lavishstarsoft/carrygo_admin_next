"use client";

import React, { useMemo, useRef, useState } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import MapsSetupHelp from "@/components/MapsSetupHelp";
import { backendUrl } from "@/utils/api";

export type FleetDriverPin = {
    _id: string;
    name?: string;
    phone?: string;
    vehicle_type?: string;
    latitude?: number | null;
    longitude?: number | null;
    ops_status?: string;
};

const MAP_CONTAINER = { width: "100%", height: "100%" };

const MARKER_COLORS: Record<string, string> = {
    idle: "#22c55e",
    on_trip: "#2563eb",
    alert: "#f59e0b",
    offline: "#94a3b8",
    blocked: "#ef4444",
};

const DEFAULT_CENTER = { lat: 16.5062, lng: 80.6480 };

type Props = {
    drivers: FleetDriverPin[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
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

export default function FleetOpsMap({ drivers, selectedId, onSelect }: Props) {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [staticError, setStaticError] = useState<string | null>(null);
    const { isLoaded, loadError, authFailed, apiKey } = useGoogleMaps();

    const pins = useMemo(
        () => drivers.filter(
            (d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
        ),
        [drivers],
    );

    const center = useMemo(() => {
        if (selectedId) {
            const sel = pins.find((p) => p._id === selectedId);
            if (sel?.latitude != null && sel.longitude != null) {
                return { lat: sel.latitude as number, lng: sel.longitude as number };
            }
        }
        if (pins.length > 0) {
            const lat = pins.reduce((s, p) => s + (p.latitude as number), 0) / pins.length;
            const lng = pins.reduce((s, p) => s + (p.longitude as number), 0) / pins.length;
            return { lat, lng };
        }
        return DEFAULT_CENTER;
    }, [pins, selectedId]);

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

    return (
        <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={center}
            zoom={pins.length <= 1 ? 14 : 12}
            onLoad={(map) => { mapRef.current = map; }}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "greedy",
                styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                ],
            }}
        >
            {pins.map((driver) => {
                const color = MARKER_COLORS[driver.ops_status || "offline"] || MARKER_COLORS.offline;
                const isSelected = selectedId === driver._id;
                const isAlert = driver.ops_status === "alert";
                return (
                    <Marker
                        key={driver._id}
                        position={{ lat: driver.latitude as number, lng: driver.longitude as number }}
                        onClick={() => onSelect?.(driver._id)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: color,
                            fillOpacity: isSelected ? 1 : 0.92,
                            strokeColor: isSelected ? "#0f172a" : "#ffffff",
                            strokeWeight: isSelected ? 3 : 2,
                            scale: isAlert ? 11 : (isSelected ? 10 : 8),
                        }}
                        title={`${driver.name || driver.phone || "Driver"} — ${driver.ops_status || "offline"}`}
                        zIndex={isAlert ? 300 : isSelected ? 200 : 100}
                        animation={isAlert ? google.maps.Animation.BOUNCE : undefined}
                    />
                );
            })}
        </GoogleMap>
    );
}
