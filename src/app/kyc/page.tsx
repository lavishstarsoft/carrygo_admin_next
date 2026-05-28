"use client";
import React, { useEffect, useState, useMemo } from 'react';
import {
    CheckCircledIcon,
    CrossCircledIcon,
    PersonIcon,
    ExclamationTriangleIcon,
    FileTextIcon,
    ImageIcon,
    MagnifyingGlassIcon,
    Cross2Icon,
} from '@radix-ui/react-icons';

// ─── Types ────────────────────────────────────────────
type KycTab = 'all' | 'pending' | 'approved' | 'rejected' | 'not_started';

// ─── Main Component ───────────────────────────────────
export default function KYCPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showReuploadModal, setShowReuploadModal] = useState(false);
    const [reuploadSelections, setReuploadSelections] = useState<Record<string, { label: string; reason: string; vehicleId?: string }>>({});
    const [pendingVehicleReject, setPendingVehicleReject] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<KycTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const backendUrl = apiUrl.replace('/api', '');

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${backendUrl}${path}`;
    };

    useEffect(() => { fetchAllDrivers(); }, []);

    const fetchAllDrivers = async () => {
        try {
            const res = await fetch(`${apiUrl}/drivers`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setDrivers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, vehicleId?: string) => {
        setActionLoading(true);
        try {
            const url = `${apiUrl}/drivers/${id}/kyc/approve${vehicleId ? `?vehicleId=${vehicleId}` : ''}`;
            const res = await fetch(url, { method: 'PUT' });
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === id ? updated : d));
                setSelectedDriver(updated);
            }
        } catch { alert('Failed to approve'); }
        finally { setActionLoading(false); }
    };

    const handleReject = async (id: string, vehicleId?: string) => {
        if (!rejectReason.trim()) { alert('Please provide a reason'); return; }
        setActionLoading(true);
        try {
            const url = `${apiUrl}/drivers/${id}/kyc/reject${vehicleId ? `?vehicleId=${vehicleId}` : ''}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            });
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === id ? updated : d));
                setSelectedDriver(updated);
                setShowRejectModal(false);
                setRejectReason('');
            }
        } catch { alert('Failed to reject'); }
        finally { setActionLoading(false); }
    };

    const toggleReuploadDoc = (key: string, label: string, vehicleId?: string) => {
        const fullKey = vehicleId ? `${vehicleId}_${key}` : key;
        setReuploadSelections(prev => {
            const copy = { ...prev };
            if (copy[fullKey]) { delete copy[fullKey]; }
            else { copy[fullKey] = { label, reason: '', vehicleId }; }
            return copy;
        });
    };

    const updateReuploadReason = (key: string, reason: string) => {
        setReuploadSelections(prev => ({ ...prev, [key]: { ...prev[key], reason } }));
    };

    const handleReupload = async (id: string) => {
        const entries = Object.entries(reuploadSelections);
        const missing = entries.filter(([, v]) => !v.reason.trim());
        if (entries.length === 0) { alert('Select at least one document'); return; }
        if (missing.length > 0) { alert(`Please provide a reason for: ${missing.map(([, v]) => v.label).join(', ')}`); return; }

        setActionLoading(true);
        try {
            // Group by vehicleId to make separate calls if necessary, or just one if same
            // For simplicity, we'll process them in groups
            const vehicleGroups: Record<string, any[]> = {};
            const profileDocs: any[] = [];

            entries.forEach(([fullKey, v]) => {
                const docKey = v.vehicleId ? fullKey.replace(`${v.vehicleId}_`, '') : fullKey;
                if (v.vehicleId) {
                    if (!vehicleGroups[v.vehicleId]) vehicleGroups[v.vehicleId] = [];
                    vehicleGroups[v.vehicleId].push({ document: docKey, reason: v.reason });
                } else {
                    profileDocs.push({ document: docKey, reason: v.reason });
                }
            });

            // Handle Profile Docs
            if (profileDocs.length > 0) {
                await fetch(`${apiUrl}/drivers/${id}/kyc/request-reupload`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documents: profileDocs }),
                });
            }

            // Handle Vehicle Docs
            for (const [vId, docs] of Object.entries(vehicleGroups)) {
                await fetch(`${apiUrl}/drivers/${id}/kyc/request-reupload?vehicleId=${vId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documents: docs }),
                });
            }

            // Final sync
            const res = await fetch(`${apiUrl}/drivers/${id}`);
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === id ? updated : d));
                setSelectedDriver(updated);
                setShowReuploadModal(false);
                setReuploadSelections({});
            }
        } catch { alert('Failed to request re-upload'); }
        finally { setActionLoading(false); }
    };

    const handleReset = async (id: string) => {
        if (!confirm('Are you sure you want to move this driver back to pending? This will clear all issues and rejection reasons.')) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${apiUrl}/drivers/${id}/kyc/reset`, { method: 'PUT' });
            if (res.ok) {
                const updated = await res.json();
                setDrivers(prev => prev.map(d => d._id === id ? updated : d));
                setSelectedDriver(updated);
                setActiveTab('pending'); // Auto-switch to see the result
                fetchAllDrivers(); // Background sync
            }
        } catch { alert('Failed to reset status'); }
        finally { setActionLoading(false); }
    };

    const formatKey = (key: string) =>
        key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // ─── Filtered Drivers ─────────────────────────────
    const filteredDrivers = useMemo(() => {
        let list = [...drivers];
        if (activeTab !== 'all') list = list.filter(d => d.kyc_status === activeTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(d =>
                d.name?.toLowerCase().includes(q) ||
                d.phone?.includes(q) ||
                d.city?.toLowerCase().includes(q) ||
                d.vehicle_number?.toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [drivers, activeTab, searchQuery]);

    // ─── Stats ────────────────────────────────────────
    const stats = useMemo(() => ({
        all: drivers.length,
        pending: drivers.filter(d => d.kyc_status === 'pending').length,
        approved: drivers.filter(d => d.kyc_status === 'approved').length,
        rejected: drivers.filter(d => d.kyc_status === 'rejected').length,
        not_started: drivers.filter(d => d.kyc_status === 'not_started').length,
    }), [drivers]);

    // ─── Document Config ──────────────────────────────
    const profileDocKeys: Record<string, string> = {
        aadhaar_front: 'Aadhaar Front', aadhaar_back: 'Aadhaar Back',
        pan_front: 'PAN Front', pan_back: 'PAN Back',
        license_front: 'License Front', license_back: 'License Back',
        selfie: 'Selfie',
    };

    const vehicleDocKeys: Record<string, string> = {
        rc_front: 'RC Front', rc_back: 'RC Back',
        insurance: 'Insurance',
    };

    const kycStatusConfig: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
        pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
        approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
        rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
        not_started: { label: 'Not Started', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
    };

    // ─── Render ───────────────────────────────────────
    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-slate-400 font-bold animate-pulse text-sm">Loading driver data...</p>
            </div>
        </div>
    );
    if (error) return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Error</h3>
            <p className="mt-1">{error}</p>
        </div>
    );

    const tabs: { key: KycTab; label: string; icon: string }[] = [
        { key: 'all', label: 'All Drivers', icon: '👥' },
        { key: 'pending', label: 'Pending', icon: '⏳' },
        { key: 'approved', label: 'Approved', icon: '✅' },
        { key: 'rejected', label: 'Rejected', icon: '❌' },
        { key: 'not_started', label: 'Not Started', icon: '📝' },
    ];

    return (
        <div className="space-y-6">
            {/* ─── Header + Stats Row ──────────────────── */}
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Driver Verification Hub</h2>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Manage KYC applications, view documents, and control driver access.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {[
                        { label: 'Total', value: stats.all, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                        { label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                        { label: 'Rejected', value: stats.rejected, color: 'bg-red-50 text-red-700 border-red-100' },
                    ].map(s => (
                        <div key={s.label} className={`${s.color} border rounded-xl px-4 py-2.5 text-center min-w-[80px]`}>
                            <p className="text-2xl font-black">{s.value}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Tabs + Search ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex gap-1 flex-wrap flex-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setSelectedDriver(null); }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'
                                }`}>{stats[tab.key]}</span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, phone, city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* ─── Main Layout ─────────────────────────── */}
            {filteredDrivers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm py-16 text-center border border-slate-100">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="text-xl font-bold text-slate-700">No drivers found</h3>
                    <p className="text-slate-400 mt-1 text-sm">Try changing the filter or search query.</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* ─── Left: Driver List ────────────────── */}
                    <div className="lg:w-[380px] shrink-0 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                            {filteredDrivers.length} result{filteredDrivers.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                            {filteredDrivers.map((driver: any) => {
                                const cfg = kycStatusConfig[driver.kyc_status] || kycStatusConfig.not_started;
                                const isSelected = selectedDriver?._id === driver._id;
                                return (
                                    <div
                                        key={driver._id}
                                        className={`bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all duration-200 group relative overflow-hidden ${isSelected
                                            ? 'border-indigo-500 shadow-lg ring-4 ring-indigo-50'
                                            : 'border-transparent shadow-sm hover:border-slate-200 hover:shadow-md'
                                            }`}
                                        onClick={() => setSelectedDriver(driver)}
                                    >
                                        {isSelected && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-r"></div>}
                                        <div className="flex items-center gap-3.5">
                                            {driver.selfie ? (
                                                <img src={getImageUrl(driver.selfie)} className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100" alt="" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400">
                                                    <PersonIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-900'} transition-colors`}>
                                                    {driver.name || 'Unnamed'}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate font-medium">{driver.phone}</p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                                {driver.kyc_status?.replace('_', ' ') || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                            <span className="text-xs text-slate-500 font-medium truncate">📍 {driver.city || 'No City'}</span>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-xs text-slate-500 font-medium">🚚 {driver.vehicle_type?.toUpperCase() || '—'}</span>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-xs text-slate-400 font-mono">{driver.vehicle_number || '—'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ─── Right: Detail Panel ──────────────── */}
                    <div className="flex-1">
                        {selectedDriver ? (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/30 relative overflow-hidden">
                                {/* Top decorative gradient */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                                <div className="p-6 sm:p-8">
                                    {/* ─── Profile Header ────────────── */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b border-slate-100">
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 shadow-lg shadow-indigo-200">
                                                {selectedDriver.selfie ? (
                                                    <img src={getImageUrl(selectedDriver.selfie)} className="w-full h-full rounded-[14px] object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                                                        <PersonIcon className="w-8 h-8 text-indigo-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                                    {selectedDriver.name || 'Driver Profile'}
                                                </h3>
                                                {(() => {
                                                    const cfg = kycStatusConfig[selectedDriver.kyc_status] || kycStatusConfig.not_started;
                                                    return (
                                                        <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                            <span className={`w-2 h-2 rounded-full ${cfg.dot} ${selectedDriver.kyc_status === 'pending' ? 'animate-pulse' : ''}`}></span>
                                                            <span className="text-sm font-bold">{cfg.label}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0">
                                            ID: {selectedDriver._id}
                                        </div>
                                    </div>

                                    {/* ─── Info Grid ──────────────────── */}
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                                        {/* Personal Info */}
                                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                                                <PersonIcon className="w-4 h-4 text-slate-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">Personal Info</h4>
                                            </div>
                                            <div className="p-5 space-y-3.5">
                                                {[
                                                    { label: 'PHONE', value: selectedDriver.phone },
                                                    { label: 'EMAIL', value: selectedDriver.email || 'N/A' },
                                                    { label: 'CITY', value: selectedDriver.city || 'N/A' },
                                                    { label: 'APPLIED', value: selectedDriver.createdAt ? new Date(selectedDriver.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A' },
                                                ].map(item => (
                                                    <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                                                        <p className="text-[10px] font-black text-slate-400 tracking-widest">{item.label}</p>
                                                        <p className="text-sm text-slate-900 font-semibold">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Vehicle Specs */}
                                        <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl overflow-hidden">
                                            <div className="bg-indigo-50 px-5 py-3.5 border-b border-indigo-100 flex items-center gap-2">
                                                <span className="text-indigo-600">🚚</span>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-700">Vehicle Specs</h4>
                                            </div>
                                            <div className="p-5 space-y-3.5">
                                                <div className="flex justify-between items-center py-1 border-b border-indigo-50">
                                                    <p className="text-[10px] font-black text-indigo-400 tracking-widest">TYPE</p>
                                                    <span className="text-sm font-bold text-indigo-900 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-indigo-100">
                                                        {selectedDriver.vehicle_type?.toUpperCase() || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-indigo-50">
                                                    <p className="text-[10px] font-black text-indigo-400 tracking-widest">PLATE</p>
                                                    <span className="text-sm font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 tracking-wider">
                                                        {selectedDriver.vehicle_number || 'N/A'}
                                                    </span>
                                                </div>
                                                {selectedDriver.vehicle_body_type && (
                                                    <div className="flex justify-between items-center py-1 border-b border-indigo-50">
                                                        <p className="text-[10px] font-black text-indigo-400 tracking-widest">BODY TYPE</p>
                                                        <p className="text-sm text-slate-900 font-semibold">{selectedDriver.vehicle_body_type}</p>
                                                    </div>
                                                )}
                                                {selectedDriver.vehicle_fuel_type && (
                                                    <div className="flex justify-between items-center py-1 border-b border-indigo-50">
                                                        <p className="text-[10px] font-black text-indigo-400 tracking-widest">FUEL TYPE</p>
                                                        <p className="text-sm text-slate-900 font-semibold">{selectedDriver.vehicle_fuel_type}</p>
                                                    </div>
                                                )}
                                                {/* Dynamic Advanced Options */}
                                                {selectedDriver.vehicle_advanced_info && Object.keys(selectedDriver.vehicle_advanced_info).length > 0 && (
                                                    <div className="pt-2 border-t border-indigo-100">
                                                        <p className="text-[10px] font-black text-indigo-500 tracking-widest mb-3">ADVANCED OPTIONS</p>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            {Object.entries(selectedDriver.vehicle_advanced_info).map(([k, v]) => (
                                                                <div key={k} className="bg-white px-3 py-2 rounded-xl border border-indigo-100 shadow-sm">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatKey(k)}</p>
                                                                    <p className="text-sm text-slate-900 font-bold mt-0.5 truncate" title={String(v)}>{String(v)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Driver Assignment */}
                                        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                                                <PersonIcon className="w-4 h-4 text-slate-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">Driver Assignment</h4>
                                            </div>
                                            <div className="p-5">
                                                {selectedDriver.driver_is_self !== false ? (
                                                    <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                                        <CheckCircledIcon className="w-6 h-6 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-bold">Owner is the driver</p>
                                                            <p className="text-emerald-600 text-sm">Applicant drives the vehicle themselves.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">DRIVER NAME</p>
                                                            <p className="text-lg font-bold text-slate-900">{selectedDriver.driver_name || 'N/A'}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">DRIVER PHONE</p>
                                                            <p className="text-lg font-bold text-slate-900">{selectedDriver.driver_phone || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rejection Reason (if rejected) */}
                                        {selectedDriver.kyc_status === 'rejected' && selectedDriver.kyc_rejection_reason && (
                                            <div className="xl:col-span-2 bg-red-50 border border-red-200 rounded-2xl p-5">
                                                <div className="flex items-start gap-3">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Rejection Reason</p>
                                                        <p className="text-sm text-red-800 font-medium">{selectedDriver.kyc_rejection_reason}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Profile Document Vault ────────────── */}
                                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 mb-8">
                                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 mb-5">
                                            <PersonIcon className="w-4 h-4" /> Profile Documents
                                            <span className="ml-auto text-slate-400 font-medium normal-case tracking-normal text-[11px]">Personal documents of the driver</span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                                            {Object.entries(profileDocKeys).map(([key, label]) => {
                                                const hasDoc = !!selectedDriver[key];
                                                const imgUrl = hasDoc ? getImageUrl(selectedDriver[key]) : '';
                                                const isSelected = !!reuploadSelections[key];
                                                return (
                                                    <div key={key} className="group flex flex-col items-center">
                                                        <div
                                                            className={`w-full aspect-[4/3] rounded-xl border-2 overflow-hidden relative cursor-pointer transition-all duration-300 shadow-sm ${hasDoc ? 'border-slate-200 hover:border-indigo-400 hover:shadow-lg bg-white' : 'border-dashed border-red-200 bg-red-50'
                                                                }`}
                                                            onClick={() => hasDoc && setLightboxImg(imgUrl)}
                                                        >
                                                            {hasDoc ? (
                                                                <>
                                                                    <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={label} />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                        <div className="bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                                                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
                                                                    <CrossCircledIcon className="w-6 h-6 mb-1 opacity-50" />
                                                                    <span className="text-[9px] font-black uppercase tracking-wider">Missing</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-700 mt-2 text-center truncate w-full">{label}</p>
                                                        {hasDoc && <p className="text-[9px] font-bold text-emerald-600 mt-0.5">✓ Uploaded</p>}
                                                        {hasDoc && (
                                                            <button
                                                                onClick={() => toggleReuploadDoc(key, label)}
                                                                className={`mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold px-2 py-1.5 rounded-lg w-full border transition-colors ${isSelected
                                                                    ? 'bg-amber-200 text-amber-900 border-amber-400'
                                                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                                                                    }`}
                                                            >
                                                                {isSelected ? 'Selected' : 'Flag Issue'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ─── Vehicles Document Vault ────────────── */}
                                    <div className="space-y-6 mb-8">
                                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600">
                                            <span>🚚</span> Registered Vehicles ({selectedDriver.vehicles?.length || 1})
                                        </h4>

                                        {(selectedDriver.vehicles || [{
                                            _id: 'primary',
                                            vehicle_type: selectedDriver.vehicle_type,
                                            vehicle_number: selectedDriver.vehicle_number,
                                            kyc_status: selectedDriver.kyc_status,
                                            rc_front: selectedDriver.rc_front,
                                            rc_back: selectedDriver.rc_back,
                                            insurance: selectedDriver.insurance
                                        }]).map((vehicle: any, vIndex: number) => {
                                            const vCfg = kycStatusConfig[vehicle.kyc_status] || kycStatusConfig.not_started;
                                            return (
                                                <div key={vehicle._id || vIndex} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                                                                <span className="text-xl">🚚</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                                    {vehicle.vehicle_number || 'No Plate'}
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 uppercase tracking-wider border border-indigo-100">
                                                                        {vehicle.vehicle_type?.toUpperCase() || 'UNKNOWN'}
                                                                    </span>
                                                                </p>
                                                                <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full ${vCfg.bg} ${vCfg.color} border ${vCfg.border} text-[10px] font-bold uppercase tracking-wider`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${vCfg.dot}`}></span>
                                                                    {vehicle.kyc_status?.replace('_', ' ') || 'not_started'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            {vehicle.kyc_status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => { setPendingVehicleReject(vehicle._id); setShowRejectModal(true); }}
                                                                        className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 transition"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApprove(selectedDriver._id, vehicle._id)}
                                                                        className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(vehicle.kyc_status === 'approved' || vehicle.kyc_status === 'rejected') && (
                                                                <button
                                                                    onClick={() => { /* reset vehicle status logic */ }}
                                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition"
                                                                >
                                                                    Re-evaluate
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                                            {Object.entries(vehicleDocKeys).map(([key, label]) => {
                                                                const hasDoc = !!vehicle[key];
                                                                const imgUrl = hasDoc ? getImageUrl(vehicle[key]) : '';
                                                                const fullKeyForSel = `${vehicle._id}_${key}`;
                                                                const isSelected = !!reuploadSelections[fullKeyForSel];
                                                                return (
                                                                    <div key={key} className="group">
                                                                        <div
                                                                            className={`w-full aspect-[4/3] rounded-2xl border-2 overflow-hidden relative cursor-pointer transition-all duration-300 ${hasDoc ? 'border-slate-100 hover:border-indigo-400 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
                                                                                }`}
                                                                            onClick={() => hasDoc && setLightboxImg(imgUrl)}
                                                                        >
                                                                            {hasDoc ? (
                                                                                <>
                                                                                    <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={label} />
                                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                                        <div className="bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 shadow-md transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                                                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                                                                    <FileTextIcon className="w-6 h-6 mb-1 opacity-40" />
                                                                                    <span className="text-[9px] font-black uppercase tracking-wider">Awaiting upload</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-3 flex justify-between items-start gap-2">
                                                                            <div>
                                                                                <p className="text-[11px] font-bold text-slate-700 truncate">{label}</p>
                                                                                {hasDoc && <p className="text-[9px] font-bold text-emerald-500 mt-0.5">Verified Link ✓</p>}
                                                                            </div>
                                                                            {hasDoc && (
                                                                                <button
                                                                                    onClick={() => toggleReuploadDoc(key, label, vehicle._id)}
                                                                                    className={`p-1.5 rounded-lg border transition-colors ${isSelected
                                                                                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                                                                                        : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200'
                                                                                        }`}
                                                                                    title="Flag for re-upload"
                                                                                >
                                                                                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ─── Multi-Doc Reupload Submit Button ── */}
                                    {selectedDriver.kyc_status === 'pending' && Object.keys(reuploadSelections).length > 0 && (
                                        <div className="flex justify-end mb-4">
                                            <button
                                                onClick={() => setShowReuploadModal(true)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-200 transition flex items-center gap-2"
                                            >
                                                <ExclamationTriangleIcon className="w-4 h-4" />
                                                Request Re-upload ({Object.keys(reuploadSelections).length} doc{Object.keys(reuploadSelections).length > 1 ? 's' : ''})
                                            </button>
                                        </div>
                                    )}

                                    {/* ─── Action Buttons ────────────── */}
                                    {selectedDriver.kyc_status === 'approved' && (
                                        <div className="mb-6 flex items-center gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                            <CheckCircledIcon className="w-6 h-6" />
                                            <p className="font-bold">This driver has been approved and is active.</p>
                                        </div>
                                    )}

                                    {selectedDriver.kyc_status === 'rejected' && (
                                        <div className="mb-6 flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200">
                                            <CrossCircledIcon className="w-6 h-6" />
                                            <p className="font-bold">This application was rejected.</p>
                                        </div>
                                    )}

                                    {selectedDriver.kyc_status === 'action_required' && (
                                        <div className="mb-6 flex items-center justify-between text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
                                            <div className="flex items-center gap-3">
                                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                                                <div>
                                                    <p className="font-bold">Action Required: Document Re-upload Pending</p>
                                                    <p className="text-sm font-medium opacity-80 mt-0.5">
                                                        Waiting for driver to re-upload {selectedDriver.kyc_issues?.length || 1} document(s)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ─── Re-evaluate Section (for non-pending) ── */}
                                    {(selectedDriver.kyc_status === 'approved' || selectedDriver.kyc_status === 'rejected' || selectedDriver.kyc_status === 'action_required') && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Re-evaluate Application</p>
                                            <div className="flex gap-3">
                                                {selectedDriver.kyc_status !== 'approved' && (
                                                    <button onClick={() => handleApprove(selectedDriver._id)} disabled={actionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50">
                                                        Revoke & Approve
                                                    </button>
                                                )}
                                                {selectedDriver.kyc_status !== 'rejected' && (
                                                    <button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50">
                                                        Revoke & Reject
                                                    </button>
                                                )}
                                                {selectedDriver.kyc_status !== 'pending' && (
                                                    <button onClick={() => handleReset(selectedDriver._id)} disabled={actionLoading} className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50">
                                                        Move to Pending
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ─── Action Buttons (for pending) ────────────── */}
                                    {selectedDriver.kyc_status === 'pending' && (
                                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
                                            <button
                                                onClick={() => setShowRejectModal(true)}
                                                disabled={actionLoading}
                                                className="sm:w-1/3 bg-white border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                                            >
                                                <CrossCircledIcon className="w-5 h-5" /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(selectedDriver._id)}
                                                disabled={actionLoading}
                                                className="sm:w-2/3 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                                            >
                                                <CheckCircledIcon className="w-5 h-5" /> Approve & Activate
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ─── Reject Modal ─────────────── */}
                                {showRejectModal && (
                                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                        <div className="bg-white shadow-2xl p-8 rounded-3xl w-full max-w-md">
                                            <div className="flex items-center gap-3 mb-5 text-red-600">
                                                <ExclamationTriangleIcon className="w-7 h-7" />
                                                <h3 className="text-2xl font-black">Reject Application</h3>
                                            </div>
                                            <p className="text-base text-slate-600 mb-6 font-medium">
                                                Provide a reason for rejecting <span className="font-bold text-slate-900">{selectedDriver.name}</span>&apos;s application.
                                            </p>
                                            <div className="bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner mb-6">
                                                <textarea
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    className="w-full p-4 bg-transparent border-0 focus:ring-0 text-slate-900 placeholder-slate-400 font-medium resize-none outline-none"
                                                    placeholder="e.g. Aadhaar card photo is blurry..."
                                                    rows={4}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    onClick={() => { setShowRejectModal(false); setRejectReason(''); setPendingVehicleReject(null); }}
                                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition"
                                                >Abort</button>
                                                <button
                                                    onClick={() => handleReject(selectedDriver._id, pendingVehicleReject || undefined)}
                                                    disabled={actionLoading || !rejectReason}
                                                    className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200 transition disabled:opacity-50"
                                                >
                                                    {actionLoading ? 'Applying...' : 'Confirm Rejection'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="glass-panel rounded-3xl h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 flex-1">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full opacity-40"></div>
                                    <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-xl relative">
                                        <MagnifyingGlassIcon className="w-10 h-10 text-indigo-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Select a Profile</h3>
                                <p className="text-slate-500 max-w-sm font-medium">
                                    Choose a driver from the list to view their full profile, uploaded documents, vehicle details, and take action.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Multi-Doc Reupload Modal ─────────────── */}
            {showReuploadModal && Object.keys(reuploadSelections).length > 0 && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white shadow-2xl p-8 rounded-3xl w-full max-w-lg border border-amber-100 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-5 text-amber-600">
                            <ExclamationTriangleIcon className="w-7 h-7" />
                            <h3 className="text-2xl font-black text-amber-600">Request Re-upload</h3>
                        </div>
                        <p className="text-base text-slate-600 mb-6 font-medium">
                            Provide a reason for each document that needs to be re-uploaded.
                        </p>

                        <div className="space-y-4 mb-6">
                            {Object.entries(reuploadSelections).map(([key, val]) => (
                                <div key={key} className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                                    <p className="text-sm font-black text-amber-800 mb-2">📄 {val.label}</p>
                                    <textarea
                                        value={val.reason}
                                        onChange={(e) => updateReuploadReason(key, e.target.value)}
                                        className="w-full p-3 bg-white border border-amber-200 rounded-xl text-slate-900 placeholder-amber-400 font-medium resize-none outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                                        placeholder="e.g. Photo is blurry, please retake..."
                                        rows={2}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => { setShowReuploadModal(false); }}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition"
                            >Cancel</button>
                            <button
                                onClick={() => handleReupload(selectedDriver._id)}
                                disabled={actionLoading}
                                className="flex-[1.5] bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition disabled:opacity-50"
                            >Send Request ({Object.keys(reuploadSelections).length})</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Image Lightbox ──────────────────────── */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition z-50"
                    >
                        <Cross2Icon className="w-6 h-6" />
                    </button>
                    <img
                        src={lightboxImg}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        alt="Document Preview"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
