"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { apiUrl } from '@/utils/api';

// Premium Icons
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-5h-7v7Z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const ShieldAlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
const NavigationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>;

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'createdAt' | 'fare'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch(`${apiUrl}/orders`);

                if (!res.ok) throw new Error('Data transmission protocol failed.');

                const data = await res.json();
                setOrders(data.orders || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const stats = useMemo(() => {
        const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
        const complete = orders.filter(o => o.status === 'delivered').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const revenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.fare?.total) || 0), 0);

        return { total: orders.length, active, complete, cancelled, revenue };
    }, [orders]);

    const filteredOrders = useMemo(() => {
        let result = [...orders];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o =>
                o._id.toLowerCase().includes(q) ||
                (o.user_id?.name || '').toLowerCase().includes(q) ||
                (o.driver_id?.name || '').toLowerCase().includes(q) ||
                (o.pickup_address || '').toLowerCase().includes(q) ||
                (o.dropoff_address || '').toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(o => o.status === statusFilter);
        }

        result.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === 'createdAt') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            } else {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        return result;
    }, [orders, searchQuery, statusFilter, sortBy, sortOrder]);


    const statusBadge = (status: string) => {
        const specs: any = {
            delivered: { bg: "bg-emerald-500/10", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
            pending: { bg: "bg-amber-500/10", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200" },
            cancelled: { bg: "bg-rose-500/10", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
            in_transit: { bg: "bg-blue-500/10", text: "text-blue-700", dot: "bg-blue-500 animate-pulse", border: "border-blue-200" },
            picked_up: { bg: "bg-violet-500/10", text: "text-violet-700", dot: "bg-violet-500", border: "border-violet-200" },
        };
        const config = specs[status] || { bg: "bg-slate-500/10", text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-200" };

        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                    {status?.replace("_", " ")}
                </span>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm animate-pulse">Acquiring Logistics Data...</p>
        </div>
    );

    if (error) return (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
            <ShieldAlertIcon />
            <div>
                <h3 className="font-black text-rose-800 tracking-tight text-lg">Transmission Interrupted</h3>
                <p className="text-rose-600 mt-1 font-medium">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Logistics Registry</h1>
                    <p className="text-slate-500 font-medium mt-1">Lifecycle tracking for all transport requests.</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 group">
                    <span className="text-lg leading-none group-hover:rotate-90 transition-transform">+</span> New Objective
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Volume', value: stats.total, icon: <PackageIcon />, bg: 'bg-indigo-50 text-indigo-700' },
                    { label: 'Live Active', value: stats.active, icon: <TruckIcon />, bg: 'bg-amber-50 text-amber-600', ping: true },
                    { label: 'Fulfilled', value: stats.complete, icon: <CheckCircleIcon />, bg: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Defunct', value: stats.cancelled, icon: <XCircleIcon />, bg: 'bg-rose-50 text-rose-600' },
                    { label: 'Gross Yield', value: `₹${stats.revenue.toLocaleString()}`, icon: <span className="font-serif">₹</span>, bg: 'bg-cyan-50 text-cyan-700' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                        <div className={`relative w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center font-black text-xl border border-white/50 group-hover:scale-110 transition-transform`}>
                            {s.ping && <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-ping opacity-75"></span>}
                            {s.ping && <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full"></span>}
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-800 leading-none tracking-tight">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Data Grid Command Bar */}
            <div className="glass-panel rounded-[32px] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/20 bg-white/40 flex flex-col lg:flex-row gap-4 justify-between items-center">

                    {/* Visual Search */}
                    <div className="flex items-center bg-white px-4 py-2.5 rounded-xl w-full lg:w-96 focus-within:ring-2 focus-within:ring-cyan-500/30 border border-slate-200 shadow-inner transition-all">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Target ID, User, Driver, or Hub..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm ml-3 w-full text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                            <option value="all">Any Status</option>
                            <option value="pending">Pending</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button
                                onClick={() => { setSortBy('createdAt'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc') }}
                                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${sortBy === 'createdAt' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Chronological {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                            </button>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <button
                                onClick={() => { setSortBy('fare'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc') }}
                                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${sortBy === 'fare' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Value {sortBy === 'fare' && (sortOrder === 'desc' ? '↓' : '↑')}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const csv = ['Ref,Client,Operator,Pickup,Dropoff,Yield,State',
                                    ...filteredOrders.map(o =>
                                        `${o._id},${o.user_id?.name || 'N/A'},${o.driver_id?.name || 'N/A'},"${o.pickup_address || ''}","${o.dropoff_address || ''}",${o.fare?.total || 0},${o.status}`
                                    )
                                ].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = 'carrygo_vectors.csv'; a.click();
                            }}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                        >
                            <DownloadIcon /> Export
                        </button>
                    </div>
                </div>

                {/* Logistics Grid Table */}
                <div className="overflow-x-auto bg-white/50 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/50 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-6 py-5">Order Reference</th>
                                <th className="px-6 py-5">Originating Client</th>
                                <th className="px-6 py-5">Assigned Asset</th>
                                <th className="px-6 py-5">Trajectory (Routing)</th>
                                <th className="px-6 py-5">Yield</th>
                                <th className="px-6 py-5 text-right">Protocol State</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                            <PackageIcon />
                                        </div>
                                        <p className="text-slate-600 font-bold text-lg">No vectors match your parameters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order: any) => (
                                    <tr key={order._id} className="hover:bg-white transition-colors group">
                                        {/* Ref */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="inline-block bg-white hover:border-cyan-200 hover:text-cyan-700 transition-colors border border-slate-200 shadow-sm px-2.5 py-1.5 rounded-lg">
                                                <p className="font-mono text-[11px] font-black tracking-wider text-slate-600 uppercase">
                                                    #{order._id.substring(order._id.length - 8)}
                                                </p>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-1">
                                                {new Date(order.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>

                                        {/* Client */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center font-black text-xs border border-violet-100">
                                                    {order.user_id?.name ? order.user_id.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{order.user_id?.name || 'Unknown User'}</p>
                                                    <p className="text-[10px] font-semibold text-slate-500">{order.user_id?.phone || 'No phone'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Driver */}
                                        <td className="px-6 py-4 align-top">
                                            {order.driver_id ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100">
                                                        {order.driver_id.name ? order.driver_id.name.charAt(0).toUpperCase() : 'D'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{order.driver_id.name}</p>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Asset Deployed</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-dashed border-amber-300 bg-amber-50">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Awaiting Assignment</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Routing */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-3 relative">
                                                {/* Connecting line */}
                                                <div className="absolute left-[5px] top-[14px] bottom-[14px] w-px bg-slate-200 border-l border-dashed border-slate-300"></div>

                                                <div className="flex items-start gap-2 relative z-10">
                                                    <div className="mt-0.5 text-cyan-500 bg-white p-0.5"><MapPinIcon /></div>
                                                    <p className="text-xs font-semibold text-slate-600 leading-tight max-w-[200px] truncate group-hover:text-slate-900 group-hover:whitespace-normal transition-all" title={order.pickup_address}>
                                                        {order.pickup_address || 'Origin Unspecified'}
                                                    </p>
                                                </div>

                                                <div className="flex items-start gap-2 relative z-10">
                                                    <div className="mt-0.5 text-rose-500 bg-white p-0.5"><NavigationIcon /></div>
                                                    <p className="text-xs font-semibold text-slate-600 leading-tight max-w-[200px] truncate group-hover:text-slate-900 group-hover:whitespace-normal transition-all" title={order.dropoff_address}>
                                                        {order.dropoff_address || 'Destination Unspecified'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Fare */}
                                        <td className="px-6 py-4 align-top">
                                            <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-800 tracking-tight group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors block w-fit">
                                                ₹{order.fare?.total || 0}
                                            </span>
                                            {order.paid && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mt-1 ml-1">&check; Settled</span>}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 text-right align-top">
                                            {statusBadge(order.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
