"use client";

import React, { useState, useEffect } from "react";
import { apiUrl } from "@/utils/api";

type Coupon = {
    _id: string;
    code: string;
    title: string;
    description: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    maxDiscount: number;
    minOrderValue: number;
    validFrom: string;
    validUntil?: string;
    isActive: boolean;
    usageLimit: number;
    timesUsed: number;
    createdAt: string;
};

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [form, setForm] = useState<Partial<Coupon>>({
        code: "",
        title: "",
        description: "",
        discountType: "flat",
        discountValue: 0,
        maxDiscount: 0,
        minOrderValue: 0,
        isActive: true,
        usageLimit: 0
    });

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/coupons`);
            if (res.ok) {
                const data = await res.json();
                setCoupons(data);
            }
        } catch (error) {
            console.error("Failed to fetch coupons", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = form._id ? `${apiUrl}/coupons/${form._id}` : `${apiUrl}/coupons`;
            const method = form._id ? "PUT" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchCoupons();
                setForm({
                    code: "", title: "", description: "", discountType: "flat", discountValue: 0, maxDiscount: 0, minOrderValue: 0, isActive: true, usageLimit: 0
                });
            } else {
                const data = await res.json();
                alert(data.error || "Failed to save coupon");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving coupon");
        } finally {
            setSaving(false);
        }
    };

    const editCoupon = (c: Coupon) => {
        setForm(c);
        setIsModalOpen(true);
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon?")) return;
        try {
            await fetch(`${apiUrl}/coupons/${id}`, { method: "DELETE" });
            fetchCoupons();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">Coupons & Offers</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage discount codes and promotional offers</p>
                </div>
                <button 
                    onClick={() => {
                        setForm({ code: "", title: "", description: "", discountType: "flat", discountValue: 0, maxDiscount: 0, minOrderValue: 0, isActive: true, usageLimit: 0 });
                        setIsModalOpen(true);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
                >
                    + Create Coupon
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10"><p className="text-slate-500 font-bold animate-pulse">Loading coupons...</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {coupons.map(c => (
                        <div key={c._id} className={`bg-white rounded-2xl border ${c.isActive ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200 shadow-slate-100/50'} shadow-xl p-6 relative overflow-hidden group`}>
                            {/* Decorative background */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-slate-50 border-[20px] border-slate-100/50 pointer-events-none"></div>
                            
                            <div className="relative z-10 flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-block px-3 py-1 bg-slate-800 text-white font-black text-sm tracking-widest rounded-lg border border-slate-700 shadow-md">
                                        {c.code}
                                    </span>
                                    <span className={`ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {c.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => editCoupon(c)} className="text-slate-400 hover:text-cyan-600 font-medium text-sm transition-colors">Edit</button>
                                    <button onClick={() => deleteCoupon(c._id)} className="text-slate-400 hover:text-rose-600 font-medium text-sm transition-colors">Delete</button>
                                </div>
                            </div>
                            
                            <div className="relative z-10">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">{c.title}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1 mb-4 leading-relaxed line-clamp-2">{c.description}</p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Discount</p>
                                        <p className="text-sm font-black text-slate-700">
                                            {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Min Order</p>
                                        <p className="text-sm font-black text-slate-700">₹{c.minOrderValue}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Used: <span className="text-slate-700">{c.timesUsed}</span> {c.usageLimit > 0 ? `/ ${c.usageLimit}` : '(Unlimited)'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {coupons.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">No coupons found. Create one to get started!</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-800">{form._id ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none">&times;</button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Coupon Code</label>
                                    <input type="text" required value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. WELCOME50" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 uppercase" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                                    <select value={form.isActive ? "true" : "false"} onChange={e => setForm({...form, isActive: e.target.value === "true"})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                                        <option value="true">Active</option>
                                        <option value="false">Disabled</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Display Title</label>
                                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. 50% OFF" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Description</label>
                                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Get 50% off up to ₹50 on your first ride" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" rows={2} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Discount Type</label>
                                    <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Discount Value</label>
                                    <input type="number" min="0" required value={form.discountValue} onChange={e => setForm({...form, discountValue: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Max Discount (₹)</label>
                                    <input type="number" min="0" value={form.maxDiscount} onChange={e => setForm({...form, maxDiscount: Number(e.target.value)})} placeholder="0 for no limit" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Min Order Value (₹)</label>
                                    <input type="number" min="0" value={form.minOrderValue} onChange={e => setForm({...form, minOrderValue: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Usage Limit (Total)</label>
                                    <input type="number" min="0" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: Number(e.target.value)})} placeholder="0 for unlimited" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Valid Until</label>
                                    <input type="datetime-local" value={form.validUntil ? new Date(form.validUntil).toISOString().slice(0, 16) : ""} onChange={e => setForm({...form, validUntil: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
