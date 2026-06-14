"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/utils/api";

// Premium Icons
const UserCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
);
const UserX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" x2="22" y1="8" y2="13" /><line x1="22" x2="17" y1="8" y2="13" /></svg>
);
const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);

export default function UsersManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<any | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [saving, setSaving] = useState(false);

    // Fetch Users
    const fetchUsers = async () => {
        try {
            const res = await fetch(`${apiUrl}/users`);
            if (!res.ok) throw new Error("Failed to fetch users");
            
            const data = await res.json();
            // Sort by newest first
            data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Toggle Block Status
    const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
        if (!process.env.NEXT_PUBLIC_API_URL && !window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;
        
        setActionLoading(userId);
        try {
            const res = await fetch(`${apiUrl}/users/${userId}/block`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_blocked: !currentStatus,
                    block_reason: !currentStatus ? 'Blocked due to policy violation' : ''
                })
            });

            if (!res.ok) throw new Error("Failed to update status");
            
            // Optimistic update
            setUsers(prev => prev.map(u => 
                u._id === userId 
                    ? { ...u, is_blocked: !currentStatus, block_reason: !currentStatus ? 'Blocked due to policy violation' : '' } 
                    : u
            ));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setSaving(true);
        setDeleteError("");
        try {
            const res = await fetch(`${apiUrl}/users/${deleteModal._id}`, { method: 'DELETE' });
            let data: any = {};
            const text = await res.text();
            if (text) {
                try { data = JSON.parse(text); } catch { data = { error: text }; }
            }
            if (res.ok) {
                setUsers(prev => prev.filter(u => u._id !== deleteModal._id));
                setDeleteModal(null);
            } else if (res.status === 404 && !data.error) {
                setDeleteError('Delete API not available on server. Deploy latest backend and try again.');
            } else {
                setDeleteError(data.error || `Failed to delete customer (${res.status})`);
            }
        } catch {
            setDeleteError('Connection error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Loading Customers...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-2xl flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-rose-800 text-lg">Failed to load users</h3>
                    <p className="text-rose-600 mt-1">{error}</p>
                </div>
                <button onClick={fetchUsers} className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 hover:bg-rose-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    const blockedCount = users.filter(u => u.is_blocked).length;
    const activeCount = users.length - blockedCount;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                            <UsersIcon />
                        </span>
                        Customer Management
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Monitor, review, and manage registered app users.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Stats Ticker */}
                    <div className="flex items-center gap-6 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Active</span>
                            <span className="text-lg font-black text-emerald-600 leading-none mt-1">{activeCount}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Blocked</span>
                            <span className="text-lg font-black text-rose-600 leading-none mt-1">{blockedCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="glass-panel flex-1 rounded-[32px] flex flex-col overflow-hidden">
                {/* Search & Filters */}
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40">
                    <div className="relative w-full sm:w-96 group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 outline-none pl-12 pr-4 py-3 rounded-2xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                        />
                    </div>
                    
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
                        Filter List
                    </button>
                </div>

                {/* Users Table */}
                <div className="flex-1 overflow-x-auto min-h-0 bg-white/30 backdrop-blur-md">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 shadow-sm border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Customer Info</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Contact</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Rides / Rating</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <p className="text-slate-500 font-bold">No users found matching "{searchQuery}"</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-indigo-50/30 transition-colors group">
                                        {/* User Info */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 flex items-center justify-center font-black text-lg border border-indigo-200/50 shadow-sm">
                                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{user.name || 'Unknown User'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5">
                                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Contact */}
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-slate-600">{user.phone}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{user.email || 'No email'}</p>
                                        </td>

                                        {/* Stats */}
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-lg font-black text-indigo-600">{user.total_rides || 0}</span>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 mt-1">
                                                    ★ {user.average_rating || '5.0'}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-5">
                                            {user.is_blocked ? (
                                                <div className="inline-flex flex-col">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 w-max">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Blocked</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 mt-1.5 max-w-[120px] truncate" title={user.block_reason}>
                                                        {user.block_reason || 'Policy Violation'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Active</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="px-6 py-5 text-right">
                                            <div className="inline-flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => toggleBlockStatus(user._id, user.is_blocked)}
                                                    disabled={actionLoading === user._id}
                                                    className={`
                                                        inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border
                                                        ${actionLoading === user._id ? 'opacity-50 cursor-not-allowed' : ''}
                                                        ${user.is_blocked 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-emerald-500/20' 
                                                            : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200'
                                                        }
                                                    `}
                                                >
                                                    {actionLoading === user._id ? (
                                                        <span className="animate-pulse">Processing...</span>
                                                    ) : user.is_blocked ? (
                                                        <><UserCheck /> Unblock</>
                                                    ) : (
                                                        <><UserX /> Block</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => { setDeleteError(""); setDeleteModal(user); }}
                                                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all border border-transparent hover:border-rose-100"
                                                    title="Delete Customer"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-[32px] max-w-sm w-full shadow-2xl border border-white" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 text-center pt-10">
                            <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 border border-rose-200 rounded-full animate-ping opacity-20"></div>
                                <div className="text-rose-500 scale-150"><TrashIcon /></div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Delete Customer</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                Permanently remove <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{deleteModal.name || deleteModal.phone}</span> from the system.
                            </p>
                            {(deleteModal.total_rides || 0) > 0 && (
                                <p className="text-xs text-amber-600 font-bold mt-3 bg-amber-50 px-3 py-2 rounded-xl">
                                    This customer has {deleteModal.total_rides} ride(s). They will be removed from the list; order history stays in the system.
                                </p>
                            )}
                            {deleteError && (
                                <p className="text-xs text-rose-600 font-bold mt-3 bg-rose-50 px-3 py-2 rounded-xl">{deleteError}</p>
                            )}
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => setDeleteModal(null)} className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
                            <button onClick={handleDelete} disabled={saving} className="flex-1 px-5 py-3 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 rounded-xl transition disabled:opacity-50">
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
