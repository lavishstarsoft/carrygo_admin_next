"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { io } from "socket.io-client";
import { apiUrl, socketUrl, getImageUrl } from "@/utils/api";
import FleetOpsMap from "@/components/FleetOpsMap";

type LiveOffer = {
    order_id: string;
    order_number?: string;
    expires_at?: string;
    pickup_address?: string;
    dropoff_address?: string;
    fare_total?: number;
    seconds_left?: number | null;
};

type ActiveTrip = {
    order_id: string;
    order_number?: string;
    status?: string;
    pickup_address?: string;
    dropoff_address?: string;
    fare_total?: number;
    payment_status?: string;
};

type FleetSummary = {
    total: number;
    online: number;
    idle: number;
    on_trip: number;
    alert: number;
    offline: number;
    blocked: number;
};

type Driver = {
    _id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    vehicle_type: string;
    vehicle_number: string;
    is_active: boolean;
    kyc_status: string;
    is_blocked?: boolean;
    block_reason?: string;
    createdAt: string;
    vehicles?: any[];
    selfie?: string;
    is_on_trip?: boolean;
    current_order_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: { type?: string; coordinates?: [number, number] };
    ops_status?: 'idle' | 'on_trip' | 'alert' | 'offline' | 'blocked';
    live_offer?: LiveOffer | null;
    active_trip?: ActiveTrip | null;
    location_updated_at?: string | null;
    
    // Designated Driver Fields
    driver_is_self?: boolean;
    driver_name?: string;
    driver_phone?: string;
    
    // Performance Metrics
    total_earnings?: number;
    total_deliveries?: number;
    average_rating?: number;
    total_ratings?: number;
};

type EditForm = {
    name: string;
    phone: string;
    email: string;
    city: string;
    vehicle_type: string;
    vehicle_number: string;
    is_active: boolean;
};

// Premium Icons
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><path d="m9 12 2 2 4-4" /></svg>;
const ShieldAlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="12" r="3" /></svg>;
const RadioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" /></svg>;

const OPS_LABELS: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    idle: { label: 'Free / Online', bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    on_trip: { label: 'On Trip', bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    alert: { label: 'Alert Ringing', bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500 animate-pulse' },
    offline: { label: 'Offline', bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
    blocked: { label: 'Blocked', bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

const timeAgo = (value?: string | null) => {
    if (!value) return '—';
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 0) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
};

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
    const [lastFleetSync, setLastFleetSync] = useState<string>('');
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [opsFilter, setOpsFilter] = useState<'all' | 'idle' | 'on_trip' | 'alert' | 'offline'>('all');
    const [kycFilter, setKycFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'not_started'>('all');
    const [vehicleFilter, setVehicleFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'phone'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modals
    const [editModal, setEditModal] = useState<Driver | null>(null);
    const [deleteModal, setDeleteModal] = useState<Driver | null>(null);
    const [viewModal, setViewModal] = useState<Driver | null>(null);
    const [blockModal, setBlockModal] = useState<Driver | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [editForm, setEditForm] = useState<EditForm>({
        name: '', phone: '', email: '', city: '',
        vehicle_type: '', vehicle_number: '', is_active: false,
    });
    const [saving, setSaving] = useState(false);

    const fetchFleet = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await fetch(`${apiUrl}/drivers/fleet/live`);
            if (!res.ok) throw new Error('System Warning: Fleet sync failed');
            const data = await res.json();
            setDrivers(data.fleet || []);
            setFleetSummary(data.summary || null);
            setLastFleetSync(data.updated_at || new Date().toISOString());
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Fetch fleet + realtime socket sync
    useEffect(() => {
        fetchFleet();

        const socket = io(socketUrl);
        socket.emit('join_admin');

        socket.on('fleet_updated', () => fetchFleet(true));
        socket.on('admin_fleet_pulse', () => fetchFleet(true));
        socket.on('order_status_change', () => fetchFleet(true));

        socket.on('admin_driver_location', (payload: {
            driver_id?: string;
            latitude?: number;
            longitude?: number;
            at?: string;
        }) => {
            if (!payload?.driver_id) return;
            setDrivers((prev) => prev.map((d) => {
                if (String(d._id) !== String(payload.driver_id)) return d;
                return {
                    ...d,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    location: {
                        type: 'Point',
                        coordinates: [payload.longitude as number, payload.latitude as number],
                    },
                    location_updated_at: payload.at || new Date().toISOString(),
                };
            }));
        });

        socket.on('nearby_driver_update', (payload: {
            driver_id?: string;
            latitude?: number;
            longitude?: number;
        }) => {
            if (!payload?.driver_id) return;
            setDrivers((prev) => prev.map((d) => {
                if (String(d._id) !== String(payload.driver_id)) return d;
                return {
                    ...d,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    location: {
                        type: 'Point',
                        coordinates: [payload.longitude as number, payload.latitude as number],
                    },
                    location_updated_at: new Date().toISOString(),
                };
            }));
        });

        const poll = setInterval(() => fetchFleet(true), 15000);

        return () => {
            clearInterval(poll);
            socket.disconnect();
        };
    }, [fetchFleet]);

    // ─── Filtered & Sorted Data ────────────────────
    const filteredDrivers = useMemo(() => {
        let result = [...drivers];

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                d.name?.toLowerCase().includes(q) ||
                d.phone?.includes(q) ||
                d.email?.toLowerCase().includes(q) ||
                d.city?.toLowerCase().includes(q) ||
                d.vehicle_number?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter === 'active') result = result.filter(d => d.is_active);
        if (statusFilter === 'inactive') result = result.filter(d => !d.is_active);

        // KYC filter
        if (kycFilter !== 'all') result = result.filter(d => d.kyc_status === kycFilter);

        // Vehicle filter
        if (vehicleFilter !== 'all') result = result.filter(d => d.vehicle_type === vehicleFilter);

        // Live ops filter
        if (opsFilter !== 'all') {
            result = result.filter((d) => {
                if (opsFilter === 'offline') return d.ops_status === 'offline' || d.ops_status === 'blocked';
                return d.ops_status === opsFilter;
            });
        }

        // Sort
        result.sort((a, b) => {
            let valA = (a as any)[sortBy] || '';
            let valB = (b as any)[sortBy] || '';
            if (sortBy === 'createdAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }
            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        return result;
    }, [drivers, searchQuery, statusFilter, kycFilter, vehicleFilter, opsFilter, sortBy, sortOrder]);

    // ─── Stats ─────────────────────────────────────
    const stats = useMemo(() => ({
        total: fleetSummary?.total ?? drivers.length,
        active: fleetSummary?.online ?? drivers.filter(d => d.is_active).length,
        idle: fleetSummary?.idle ?? drivers.filter(d => d.ops_status === 'idle').length,
        onTrip: fleetSummary?.on_trip ?? drivers.filter(d => d.ops_status === 'on_trip').length,
        alert: fleetSummary?.alert ?? drivers.filter(d => d.ops_status === 'alert').length,
        offline: fleetSummary?.offline ?? drivers.filter(d => !d.is_active || d.ops_status === 'offline').length,
        kycApproved: drivers.filter(d => d.kyc_status === 'approved').length,
        kycPending: drivers.filter(d => d.kyc_status === 'pending').length,
    }), [drivers, fleetSummary]);

    const vehicleTypes = useMemo(() => {
        const types = new Set(drivers.map(d => d.vehicle_type).filter(Boolean));
        return Array.from(types);
    }, [drivers]);

    // ─── Edit ──────────────────────────────────────
    const openEdit = (driver: Driver) => {
        setEditForm({
            name: driver.name || '',
            phone: driver.phone || '',
            email: driver.email || '',
            city: driver.city || '',
            vehicle_type: driver.vehicle_type || '',
            vehicle_number: driver.vehicle_number || '',
            is_active: driver.is_active || false,
        });
        setEditModal(driver);
    };

    const handleSaveEdit = async () => {
        if (!editModal) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/drivers/${editModal._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === updated._id ? updated : d));
                setEditModal(null);
            }
        } catch (err) {
            alert('Operation Error: Update Failed');
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete ────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteModal) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/drivers/${deleteModal._id}`, { method: 'DELETE' });
            if (res.ok) {
                setDrivers(prev => prev.filter(d => d._id !== deleteModal._id));
                setDeleteModal(null);
            }
        } catch (err) {
            alert('Operation Error: Deletion Failed');
        } finally {
            setSaving(false);
        }
    };

    // ─── Toggle Active ─────────────────────────────
    const toggleActive = async (driver: Driver) => {
        try {
            const res = await fetch(`${apiUrl}/drivers/${driver._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !driver.is_active }),
            });
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === updated._id ? updated : d));
            }
        } catch { }
    };

    const handleBlock = async () => {
        if (!blockModal) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/drivers/${blockModal._id}/block`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: blockReason }),
            });
            if (res.ok) {
                const data = await res.json();
                setDrivers(prev => prev.map(d => d._id === data.driver._id ? data.driver : d));
                setBlockModal(null);
                setBlockReason('');
            }
        } catch {
            alert('Operation Error: Block Failed');
        } finally {
            setSaving(false);
        }
    };

    const handleUnblock = async (driver: Driver) => {
        try {
            const res = await fetch(`${apiUrl}/drivers/${driver._id}/unblock`, { method: 'PUT' });
            if (res.ok) {
                const data = await res.json();
                setDrivers(prev => prev.map(d => d._id === data.driver._id ? data.driver : d));
            }
        } catch {
            alert('Operation Error: Unblock Failed');
        }
    };

    // ─── KYC Badge ─────────────────────────────────
    const opsBadge = (status?: string) => {
        const config = OPS_LABELS[status || 'offline'] || OPS_LABELS.offline;
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                    {config.label}
                </span>
            </div>
        );
    };

    const kycBadge = (status: string) => {
        const specs: Record<string, any> = {
            approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
            pending: { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500 animate-pulse' },
            rejected: { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
            not_started: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
        };
        const config = specs[status] || specs.not_started;
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                    {status?.replace('_', ' ') || 'Not Started'}
                </span>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm animate-pulse">Syncing Fleet Roster...</p>
        </div>
    );

    if (error) return (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
            <ShieldAlertIcon />
            <div>
                <h3 className="font-black text-rose-800 tracking-tight text-lg">System Error</h3>
                <p className="text-rose-600 mt-1 font-medium">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Fleet Command</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Live ops — who is free, on trip, getting alerts, and where they are moving.
                    </p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Last sync: {timeAgo(lastFleetSync)}
                </div>
            </div>

            {/* Live Ops Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Online', value: stats.active, gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/30', icon: <CheckCircleIcon /> },
                    { label: 'Free / Idle', value: stats.idle, gradient: 'from-green-500 to-lime-500', shadow: 'shadow-green-500/30', icon: <UsersIcon /> },
                    { label: 'On Trip', value: stats.onTrip, gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/30', icon: <ShieldCheckIcon /> },
                    { label: 'Alert Ringing', value: stats.alert, gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/30', icon: <RadioIcon /> },
                    { label: 'Offline', value: stats.offline, gradient: 'from-slate-500 to-slate-700', shadow: 'shadow-slate-500/30', icon: <XCircleIcon /> },
                    { label: 'KYC Pending', value: stats.kycPending, gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30', icon: <ShieldAlertIcon /> },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg ${s.shadow} group-hover:scale-110 transition-transform`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-800 leading-none">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Fleet Map */}
            <div className="glass-panel rounded-[28px] overflow-hidden border border-white/30">
                <div className="px-5 py-4 border-b border-slate-100/80 flex flex-wrap items-center justify-between gap-3 bg-white/50">
                    <div>
                        <p className="text-sm font-black text-slate-800">Live Fleet Map</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                            Green = Free • Blue = On Trip • Amber = Alert • Gray = Offline
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                        {Object.entries(OPS_LABELS).slice(0, 4).map(([key, cfg]) => (
                            <span key={key} className={`px-2 py-1 rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="h-[340px] bg-slate-100">
                    <FleetOpsMap
                        drivers={drivers}
                        selectedId={selectedDriverId}
                        onSelect={setSelectedDriverId}
                    />
                </div>
            </div>

            {/* SaaS Data Grid Area */}
            <div className="glass-panel rounded-[32px] overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-6 border-b border-white/20 bg-white/40 flex flex-col lg:flex-row gap-4 justify-between items-center">

                    <div className="flex items-center bg-white px-4 py-2.5 rounded-xl w-full lg:w-96 focus-within:ring-2 focus-within:ring-indigo-500/30 border border-slate-200 shadow-inner transition-all group">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Query name, phone, email, plate..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm ml-3 w-full text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        <select
                            value={opsFilter}
                            onChange={(e) => setOpsFilter(e.target.value as any)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                            <option value="all">All Ops</option>
                            <option value="idle">Free / Idle</option>
                            <option value="on_trip">On Trip</option>
                            <option value="alert">Alert Ringing</option>
                            <option value="offline">Offline</option>
                        </select>

                        <select
                            value={kycFilter}
                            onChange={(e) => setKycFilter(e.target.value as any)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                            <option value="all">All KYC</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                            <option value="not_started">Unverified</option>
                        </select>

                        <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

                        <button
                            onClick={() => {
                                const csv = ['Name,Phone,Email,City,Vehicle,Number,Status,KYC',
                                    ...filteredDrivers.map(d =>
                                        `${d.name},${d.phone},${d.email},${d.city},${d.vehicle_type},${d.vehicle_number},${d.is_active ? 'Active' : 'Inactive'},${d.kyc_status},${d.vehicles?.length || 1}`
                                    )
                                ].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = 'carrygo_fleet.csv'; a.click();
                            }}
                            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider border border-indigo-200 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <DownloadIcon /> Export
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-white/50 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/50 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-6 py-5">Operator Profile</th>
                                <th className="px-6 py-5">Live Ops</th>
                                <th className="px-6 py-5">Location</th>
                                <th className="px-6 py-5">Contact Details</th>
                                <th className="px-6 py-5">Assets (Vehicle)</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-indigo-500 flex items-center gap-1" onClick={() => { setSortBy('createdAt'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc') }}>
                                    Compliance (KYC) {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="px-6 py-5 text-center">Online</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                            <SearchIcon />
                                        </div>
                                        <p className="text-slate-600 font-bold text-lg">Zero results found.</p>
                                        <p className="text-slate-400 text-sm mt-1">Adjust your filter parameters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map((driver) => (
                                    <tr
                                        key={driver._id}
                                        className={`hover:bg-white transition-colors group ${selectedDriverId === driver._id ? 'bg-indigo-50/60' : ''}`}
                                        onClick={() => setSelectedDriverId(driver._id)}
                                    >

                                        {/* Profile */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 transition-transform overflow-hidden">
                                                        {driver.selfie ? (
                                                            <img 
                                                                src={getImageUrl(driver.selfie)} 
                                                                alt={driver.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as any).src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(driver.name || 'U');
                                                                }}
                                                            />
                                                        ) : (
                                                            driver.name ? driver.name.charAt(0).toUpperCase() : '?'
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${driver.is_blocked ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : driver.is_active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{driver.name || 'Unnamed'}</p>
                                                        {driver.is_blocked && (
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500 text-white uppercase tracking-tighter shadow-sm animate-pulse">SUSPENDED</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{driver.city || 'No Region'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Live Ops */}
                                        <td className="px-6 py-4 align-top">
                                            {opsBadge(driver.ops_status)}
                                            {driver.ops_status === 'alert' && driver.live_offer && (
                                                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                                                        Trip Alert
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                                                        #{driver.live_offer.order_number || driver.live_offer.order_id?.slice(-6)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                                        {driver.live_offer.pickup_address || 'Pickup'}
                                                    </p>
                                                    {driver.live_offer.seconds_left != null && (
                                                        <p className="text-[9px] font-black text-amber-700 mt-1">
                                                            {driver.live_offer.seconds_left}s left
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {driver.ops_status === 'on_trip' && driver.active_trip && (
                                                <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                                                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                                                        {driver.active_trip.status?.replace('_', ' ') || 'In Transit'}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                                                        #{driver.active_trip.order_number || driver.active_trip.order_id?.slice(-6)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                                        → {driver.active_trip.dropoff_address || 'Dropoff'}
                                                    </p>
                                                </div>
                                            )}
                                            {driver.ops_status === 'idle' && (
                                                <p className="text-[10px] font-bold text-emerald-600 mt-1.5 uppercase tracking-wider">
                                                    Ready for dispatch
                                                </p>
                                            )}
                                        </td>

                                        {/* Location */}
                                        <td className="px-6 py-4 align-top">
                                            {Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude) ? (
                                                <div>
                                                    <div className="flex items-start gap-1.5">
                                                        <span className="text-cyan-500 mt-0.5"><MapPinIcon /></span>
                                                        <div>
                                                            <p className="font-mono text-[11px] font-bold text-slate-700">
                                                                {(driver.latitude as number).toFixed(5)}, {(driver.longitude as number).toFixed(5)}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                                                Updated {timeAgo(driver.location_updated_at)}
                                                            </p>
                                                            <a
                                                                href={`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 mt-1 inline-block uppercase tracking-wider"
                                                            >
                                                                Open in Maps →
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] font-bold text-slate-400">No GPS yet</p>
                                            )}
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-sm text-slate-700">{driver.phone}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{driver.email || 'No email'}</p>
                                        </td>

                                        {/* Assets */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm mb-1 group-hover:border-indigo-200 transition-colors">
                                                    🚚 {driver.vehicle_type || 'Unknown'}
                                                </span>
                                                <p className="font-mono text-xs font-bold text-slate-700">{driver.vehicle_number || 'N/A'}</p>
                                                {driver.vehicles && driver.vehicles.length > 1 && (
                                                    <p className="text-[9px] font-bold text-indigo-500 mt-1 uppercase tracking-tighter">
                                                        +{driver.vehicles.length - 1} more vehicles
                                                    </p>
                                                )}
                                            </div>
                                        </td>

                                        {/* KYC */}
                                        <td className="px-6 py-4">
                                            {kycBadge(driver.kyc_status)}
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">
                                                Join: {new Date(driver.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </p>
                                        </td>

                                        {/* Online Toggle */}
                                        <td className="px-6 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => toggleActive(driver)}
                                                className={`relative w-12 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${driver.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${driver.is_active ? 'left-[26px]' : 'left-1'}`} />
                                            </button>
                                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 ${driver.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {driver.is_active ? 'Active' : 'Offline'}
                                            </p>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setViewModal(driver)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all" title="View Profile"><EyeIcon /></button>
                                                <button onClick={() => openEdit(driver)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-amber-600 rounded-lg transition-all" title="Edit Metadata"><EditIcon /></button>

                                                {driver.is_blocked ? (
                                                    <button onClick={() => handleUnblock(driver)} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all" title="Unblock Operator">
                                                        <ShieldCheckIcon />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setBlockModal(driver)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all" title="Block Operator">
                                                        <ShieldAlertIcon />
                                                    </button>
                                                )}

                                                <button onClick={() => setDeleteModal(driver)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all" title="Purge Record"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── MODALS ────────────────────────── */}
            {/* View Modal */}
            {viewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setViewModal(null)}>
                    <div className="bg-slate-50 rounded-[40px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="p-8 pb-3 flex justify-between items-start">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-200 overflow-hidden border-2 border-white">
                                    {viewModal.selfie ? (
                                        <img 
                                            src={getImageUrl(viewModal.selfie)} 
                                            alt={viewModal.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        viewModal.name ? viewModal.name.charAt(0).toUpperCase() : '?'
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{viewModal.name || 'Unnamed Operator'}</h3>
                                        <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">Operator Profile</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        {viewModal.phone} • {viewModal.city}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewModal(null)} className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 shadow-sm transition-all border border-slate-100"><XCircleIcon /></button>
                        </div>

                        <div className="px-8 pb-10 space-y-6">
                            
                            {/* Performance Stats Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Earnings</p>
                                    <p className="text-xl font-black text-emerald-600">₹{viewModal.total_earnings?.toLocaleString() || '0'}</p>
                                    <div className="mt-2 w-full h-1 bg-emerald-50 rounded-full overflow-hidden"><div className="w-2/3 h-full bg-emerald-500 rounded-full"></div></div>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deliveries</p>
                                    <p className="text-xl font-black text-indigo-600">{viewModal.total_deliveries || 0} Trips</p>
                                    <div className="mt-2 w-full h-1 bg-indigo-50 rounded-full overflow-hidden"><div className="w-1/2 h-full bg-indigo-500 rounded-full"></div></div>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rating</p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xl font-black text-amber-500">{viewModal.average_rating || '5.0'}</p>
                                        <span className="text-sm">⭐</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">From {viewModal.total_ratings || 0} reviews</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                
                                {/* Identity & Assets */}
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Designated Driver</h4>
                                            {viewModal.driver_is_self && (
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-tighter border border-emerald-200">Owner Operated</span>
                                            )}
                                        </div>
                                        <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><UsersIcon /></div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{viewModal.driver_is_self ? viewModal.name : (viewModal.driver_name || 'Not Registered')}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{viewModal.driver_is_self ? 'Acccount Owner' : 'Designated Driver'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-sm">📱</div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{viewModal.driver_is_self ? viewModal.phone : (viewModal.driver_phone || '—')}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Direct Line</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-3 ml-1">Core Assets</h4>
                                        <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-xl">🚚</div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{viewModal.vehicle_type || 'Unknown'}</p>
                                                    <p className="text-sans text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{viewModal.vehicle_number || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Network & Join Details */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Compliance & Status</h4>
                                        <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-5">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Ops Status</p>
                                                <div className="mb-3">{opsBadge(viewModal.ops_status)}</div>
                                                {viewModal.active_trip && (
                                                    <p className="text-[11px] font-bold text-blue-700">
                                                        Trip #{viewModal.active_trip.order_number} — {viewModal.active_trip.status}
                                                    </p>
                                                )}
                                                {viewModal.live_offer && (
                                                    <p className="text-[11px] font-bold text-amber-700">
                                                        Alert for #{viewModal.live_offer.order_number}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sync Protocol Status</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${viewModal.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                                                        <span className={`text-xs font-black ${viewModal.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>{viewModal.is_active ? 'ONLINE & ACTIVE' : 'OFFLINE'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Verification Rank</p>
                                                <div className="transform scale-90 origin-left">{kycBadge(viewModal.kyc_status)}</div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-50">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Network Join Date</p>
                                                <p className="text-xs font-bold text-slate-700">{viewModal.createdAt ? new Date(viewModal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (SaaS UI) */}
            {editModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setEditModal(null)}>
                    <div className="bg-white rounded-[32px] max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[32px]">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <EditIcon /> Modify Records
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Ref: {editModal._id.substring(0, 8)}</p>
                            </div>
                            <button onClick={() => setEditModal(null)} className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors"><XCircleIcon /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                {[
                                    { key: 'name', label: 'Full Name', type: 'text', col: 'col-span-2' },
                                    { key: 'phone', label: 'Phone Number', type: 'tel', col: 'col-span-1' },
                                    { key: 'city', label: 'Base City', type: 'text', col: 'col-span-1' },
                                    { key: 'email', label: 'Secure Email', type: 'email', col: 'col-span-2' },
                                    { key: 'vehicle_type', label: 'Asset Class (Type)', type: 'text', col: 'col-span-1' },
                                    { key: 'vehicle_number', label: 'License Plate', type: 'text', col: 'col-span-1' },
                                ].map(field => (
                                    <div key={field.key} className={field.col}>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                        <input
                                            type={field.type}
                                            value={(editForm as any)[field.key]}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-indigo-900">Operational Status</p>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Toggle network access</p>
                                </div>
                                <button
                                    onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                                    className={`relative w-12 h-6 rounded-full transition-all ${editForm.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${editForm.is_active ? 'left-[26px]' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50 rounded-b-[32px]">
                            <button onClick={() => setEditModal(null)} className="px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 transition">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving} className="px-6 py-3 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                                {saving ? <span className="animate-pulse">Writing...</span> : 'Commit Change'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl border border-white" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 text-center pt-10">
                            <div className="w-20 h-20 bg-rose-50 border-4 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border border-rose-200 rounded-full animate-ping opacity-20"></div>
                                <div className="text-rose-500 scale-150"><TrashIcon /></div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Terminate Record</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                Erasure of operator <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{deleteModal.name || deleteModal.phone}</span> is permanent and cannot be reversed.
                            </p>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => setDeleteModal(null)} className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Abort</button>
                            <button onClick={handleDelete} disabled={saving} className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 rounded-xl transition disabled:opacity-50">
                                {saving ? 'Processing...' : 'Execute'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Modal */}
            {blockModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setBlockModal(null)}>
                    <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl border border-white" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 text-center pt-10">
                            <div className="w-20 h-20 bg-rose-50 border-4 border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border border-rose-200 rounded-full animate-ping opacity-20"></div>
                                <div className="text-rose-500 scale-150"><ShieldAlertIcon /></div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Suspend Operator</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 px-4">
                                Account: {blockModal.name || blockModal.phone}
                            </p>

                            <div className="text-left px-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Suspension Protocol Reason</label>
                                <textarea
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Enter violation details..."
                                    className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 min-h-[100px] resize-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => setBlockModal(null)} className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Abort</button>
                            <button
                                onClick={handleBlock}
                                disabled={saving || !blockReason}
                                className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 rounded-xl transition disabled:opacity-50"
                            >
                                {saving ? 'Applying...' : 'Suspend Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
