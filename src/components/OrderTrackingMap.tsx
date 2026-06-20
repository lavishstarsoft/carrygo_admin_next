"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { io, Socket } from "socket.io-client";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import MapsSetupHelp from "@/components/MapsSetupHelp";
import { apiUrl, socketUrl } from "@/utils/api";
import { decodePolyline } from "@/utils/polyline";

type Coord = { lat: number; lng: number };

export type TrackOrder = {
    _id: string;
    order_number?: string;
    status: string;
    pickup?: { lat: number; lng: number; address?: string };
    dropoff?: { lat: number; lng: number; address?: string };
    route_polyline?: string;
    driver_id?: {
        _id?: string;
        name?: string;
        phone?: string;
        vehicle_type?: string;
        latitude?: number;
        longitude?: number;
        location?: { coordinates?: [number, number] };
    } | null;
    user_id?: { name?: string; phone?: string };
};

const MAP_CONTAINER = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 16.5062, lng: 80.6480 };

const PHASE_LABELS: Record<string, string> = {
    accepted: "Driver heading to pickup",
    driver_arrived: "Driver at pickup",
    picked_up: "Goods picked up — en route",
    in_transit: "Delivering to drop",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

function toCoord(point?: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null): Coord | null {
    if (!point) return null;
    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat: lat as number, lng: lng as number };
}

function getDriverCoord(driver: TrackOrder["driver_id"]): Coord | null {
    if (!driver) return null;
    if (Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude)) {
        return { lat: driver.latitude as number, lng: driver.longitude as number };
    }
    const coords = driver.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
        return { lat: coords[1], lng: coords[0] };
    }
    return null;
}

function normalizeRoutePoints(data: any): Coord[] {
    if (Array.isArray(data?.coordinates) && data.coordinates.length > 1) {
        return data.coordinates
            .map((c: any) => toCoord(c))
            .filter(Boolean) as Coord[];
    }
    if (data?.polyline) {
        return decodePolyline(data.polyline).map((c) => ({ lat: c.latitude, lng: c.longitude }));
    }
    return [];
}

function getRemainingRoute(current: Coord, route: Coord[]): Coord[] {
    if (!route.length) return [];
    let minDist = Infinity;
    let closest = 0;
    route.forEach((p, i) => {
        const d = Math.hypot(p.lat - current.lat, p.lng - current.lng);
        if (d < minDist) {
            minDist = d;
            closest = i;
        }
    });
    return route.slice(Math.max(0, closest - 1));
}

function getDistanceM(a: Coord, b: Coord): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type Props = {
    order: TrackOrder;
    onClose?: () => void;
};

export default function OrderTrackingMap({ order: initialOrder, onClose }: Props) {
    const mapRef = useRef<google.maps.Map | null>(null);
    const didInitialFit = useRef(false);
    const lastRouteFetchRef = useRef<Coord | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const [order, setOrder] = useState<TrackOrder>(initialOrder);
    const [driverPos, setDriverPos] = useState<Coord | null>(getDriverCoord(initialOrder.driver_id));
    const [tripRoute, setTripRoute] = useState<Coord[]>([]);
    const [legRoute, setLegRoute] = useState<Coord[]>([]);
    const [mapType, setMapType] = useState<google.maps.MapTypeId>("roadmap" as google.maps.MapTypeId);

    const { isLoaded, loadError, authFailed, apiKey } = useGoogleMaps();

    const orderId = order._id;
    const pickup = useMemo(() => toCoord(order.pickup), [order.pickup]);
    const dropoff = useMemo(() => toCoord(order.dropoff), [order.dropoff]);
    const isLive = ["accepted", "driver_arrived", "picked_up", "in_transit"].includes(order.status);

    const fetchRoadRoute = useCallback(async (origin: Coord, dest: Coord) => {
        const qs = new URLSearchParams({
            origin_lat: String(origin.lat),
            origin_lng: String(origin.lng),
            dest_lat: String(dest.lat),
            dest_lng: String(dest.lng),
        });
        const res = await fetch(`${apiUrl}/orders/route?${qs.toString()}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.success) return [];
        return normalizeRoutePoints(data);
    }, []);

    // Poll order + sync trip polyline
    useEffect(() => {
        let cancelled = false;

        const refresh = async () => {
            try {
                const res = await fetch(`${apiUrl}/orders/${orderId}`);
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                setOrder(data);
                const drv = getDriverCoord(data.driver_id);
                if (drv && !socketRef.current?.connected) setDriverPos(drv);
                if (data.route_polyline) {
                    const decoded = decodePolyline(data.route_polyline).map((c) => ({
                        lat: c.latitude,
                        lng: c.longitude,
                    }));
                    if (decoded.length > 1) setTripRoute(decoded);
                }
            } catch {
                // ignore poll errors
            }
        };

        refresh();
        const timer = window.setInterval(refresh, isLive ? 5000 : 15000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [orderId, isLive]);

    // Trip route from stored polyline on first load
    useEffect(() => {
        if (!order.route_polyline) return;
        const decoded = decodePolyline(order.route_polyline).map((c) => ({
            lat: c.latitude,
            lng: c.longitude,
        }));
        if (decoded.length > 1) setTripRoute(decoded);
    }, [order.route_polyline]);

    // Live driver socket
    useEffect(() => {
        if (!isLive) return;
        const socket = io(socketUrl, { transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on(`driver_location_${orderId}`, (data: { latitude: number; longitude: number }) => {
            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setDriverPos({ lat, lng });
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [orderId, isLive]);

    // Fetch active leg route (driver→pickup or driver→dropoff) like user/driver apps
    useEffect(() => {
        if (!driverPos || !isLive) {
            setLegRoute([]);
            return;
        }

        const beforePickup = ["accepted", "driver_arrived"].includes(order.status);
        const afterPickup = ["picked_up", "in_transit"].includes(order.status);
        const dest = beforePickup ? pickup : afterPickup ? dropoff : null;
        if (!dest) {
            setLegRoute([]);
            return;
        }

        if (lastRouteFetchRef.current) {
            const moved = getDistanceM(driverPos, lastRouteFetchRef.current);
            if (moved < 120) return;
        }

        let cancelled = false;
        (async () => {
            const coords = await fetchRoadRoute(driverPos, dest);
            if (cancelled || coords.length < 2) return;
            setLegRoute(coords);
            lastRouteFetchRef.current = { ...driverPos };
        })();

        return () => { cancelled = true; };
    }, [
        driverPos?.lat,
        driverPos?.lng,
        order.status,
        pickup?.lat,
        pickup?.lng,
        dropoff?.lat,
        dropoff?.lng,
        isLive,
        fetchRoadRoute,
    ]);

    const displayRoute = useMemo(() => {
        if (!driverPos) return legRoute.length > 1 ? legRoute : tripRoute;
        if (legRoute.length > 1) return getRemainingRoute(driverPos, legRoute);
        if (tripRoute.length > 1 && ["picked_up", "in_transit", "delivered"].includes(order.status)) {
            return getRemainingRoute(driverPos, tripRoute);
        }
        return legRoute.length > 1 ? legRoute : tripRoute;
    }, [driverPos, legRoute, tripRoute, order.status]);

    const fitRoute = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        const bounds = new google.maps.LatLngBounds();
        let hasPoint = false;
        const add = (p: Coord | null) => {
            if (!p) return;
            bounds.extend(p);
            hasPoint = true;
        };
        add(pickup);
        add(dropoff);
        add(driverPos);
        displayRoute.forEach((p) => add(p));
        if (!hasPoint) return;
        if (displayRoute.length <= 1 && driverPos) {
            map.setCenter(driverPos);
            map.setZoom(15);
            return;
        }
        map.fitBounds(bounds, 56);
    }, [pickup, dropoff, driverPos, displayRoute]);

    useEffect(() => {
        if (!isLoaded || didInitialFit.current) return;
        const id = window.setTimeout(() => {
            fitRoute();
            didInitialFit.current = true;
        }, 200);
        return () => window.clearTimeout(id);
    }, [isLoaded, displayRoute.length, fitRoute]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLoaded) return;
        map.setMapTypeId(mapType);
        map.setOptions({
            styles: mapType === ("roadmap" as google.maps.MapTypeId)
                ? [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
                : [],
        });
    }, [mapType, isLoaded]);

    if (!apiKey) {
        return <MapsSetupHelp title="Google Maps key missing" />;
    }

    if (authFailed || loadError || !isLoaded) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
                {loadError || authFailed ? "Map unavailable — check Google Maps billing" : "Loading map..."}
            </div>
        );
    }

    const phaseLabel = PHASE_LABELS[order.status] || order.status.replace(/_/g, " ");

    return (
        <div className="relative w-full h-full fleet-map-root">
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER}
                defaultCenter={pickup || dropoff || DEFAULT_CENTER}
                defaultZoom={13}
                onLoad={(map) => { mapRef.current = map; }}
                onUnmount={() => { mapRef.current = null; }}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    fullscreenControl: true,
                    gestureHandling: "greedy",
                    clickableIcons: false,
                }}
            >
                {tripRoute.length > 1 && (
                    <Polyline
                        path={tripRoute}
                        options={{
                            strokeColor: "#94a3b8",
                            strokeOpacity: 0.45,
                            strokeWeight: 4,
                            zIndex: 1,
                        }}
                    />
                )}

                {displayRoute.length > 1 && (
                    <Polyline
                        path={displayRoute}
                        options={{
                            strokeColor: "#2563eb",
                            strokeOpacity: 0.95,
                            strokeWeight: 6,
                            zIndex: 2,
                        }}
                    />
                )}

                {pickup && (
                    <Marker
                        position={pickup}
                        label={{ text: "P", color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "#22c55e",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                            scale: 10,
                        }}
                        title={`Pickup: ${order.pickup?.address || ""}`}
                        zIndex={120}
                    />
                )}

                {dropoff && (
                    <Marker
                        position={dropoff}
                        label={{ text: "D", color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "#ef4444",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                            scale: 10,
                        }}
                        title={`Drop: ${order.dropoff?.address || ""}`}
                        zIndex={120}
                    />
                )}

                {driverPos && isLive && (
                    <Marker
                        position={driverPos}
                        icon={{
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            fillColor: "#2563eb",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                            scale: 5,
                            rotation: 0,
                        }}
                        title={order.driver_id?.name || "Driver"}
                        zIndex={200}
                    />
                )}
            </GoogleMap>

            {/* Header overlay */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md px-3 py-2 max-w-md">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Live route · #{order.order_number || order._id.slice(-8)}
                    </p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{phaseLabel}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] font-semibold text-slate-500">
                        <span>User: {order.user_id?.name || "—"}</span>
                        <span>Driver: {order.driver_id?.name || "—"}</span>
                    </div>
                </div>
                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="pointer-events-auto px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-[10px] font-black uppercase text-slate-600 shadow-md hover:bg-white"
                    >
                        Close
                    </button>
                ) : null}
            </div>

            {/* Controls */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={fitRoute}
                    className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-white"
                >
                    Fit route
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-[10px] font-bold text-slate-600 shadow-md">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" /> Pickup
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 mx-1" /> Drop
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-600 ml-1" /> Driver
                </div>
            </div>

            <div className="absolute bottom-3 right-3 flex rounded-lg bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 overflow-hidden">
                {(["roadmap", "satellite", "hybrid"] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setMapType(type as google.maps.MapTypeId)}
                        className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider ${
                            mapType === type ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        {type === "roadmap" ? "Map" : type}
                    </button>
                ))}
            </div>
        </div>
    );
}
