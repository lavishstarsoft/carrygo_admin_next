"use client";
import React, { useEffect, useState } from "react";
import { 
    Plus, Search, Edit2, Trash2, 
    Truck, MapPin, Gauge, LayoutGrid, 
    Save, X, Info, AlertTriangle, ChevronRight, Zap
} from "lucide-react";

export default function PricingMatrix() {
    const [pricing, setPricing] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        city: "Vijayawada",
        vehicle_type: "2w",
        vehicle_body_type: "all",
        delivery_zone: "",
        base_fare: 40,
        base_km: 2,
        per_km_rate: 12,
        per_min_rate: 1,
        min_fare: 50,
        max_fare: 0,
        max_distance_km: 0,
        loading_charges: 0,
        unloading_charges: 0,
        platform_commission_percent: 15,
        isActive: true
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pricingRes, zonesRes] = await Promise.all([
                fetch(`${apiUrl}/fare/pricing`),
                fetch(`${apiUrl}/fare/zones`)
            ]);
            
            if (!pricingRes.ok || !zonesRes.ok) throw new Error("Connection Failure");
            
            const pData = await pricingRes.json();
            const zData = await zonesRes.json();
            
            setPricing(pData);
            setZones(zData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/fare/pricing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            
            if (!res.ok) throw new Error("Failed to save pricing");
            
            setIsModalOpen(false);
            setEditingItem(null);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this pricing rule?")) return;
        try {
            await fetch(`${apiUrl}/fare/pricing/${id}`, { method: "DELETE" });
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openEdit = (item: any) => {
        setEditingItem(item);
        setFormData({
            city: item.city,
            vehicle_type: item.vehicle_type,
            vehicle_body_type: item.vehicle_body_type || "all",
            delivery_zone: item.delivery_zone?._id || "",
            base_fare: item.base_fare,
            base_km: item.base_km || 2,
            per_km_rate: item.per_km_rate,
            per_min_rate: item.per_min_rate,
            min_fare: item.min_fare,
            max_fare: item.max_fare || 0,
            max_distance_km: item.max_distance_km || 0,
            loading_charges: item.loading_charges || 0,
            unloading_charges: item.unloading_charges || 0,
            platform_commission_percent: item.platform_commission_percent || 15,
            isActive: item.active !== undefined ? item.active : true
        });
        setIsModalOpen(true);
    };

    if (loading && pricing.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Pricing Matrix...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pricing Matrix</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage distance-based charges, base fares, and zone overrides.</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingItem(null);
                        setFormData({...formData, delivery_zone: ""});
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:bg-cyan-600 hover:shadow-cyan-600/30 transition-all group active:scale-95"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    New Pricing Rule
                </button>
            </div>

            {/* Info Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Base Logic</p>
                        <p className="text-sm font-bold text-indigo-900 mt-1">Uber-style (Base + Variable) is active. First X km included.</p>
                    </div>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 rounded-3xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">Geofencing</p>
                        <p className="text-sm font-bold text-cyan-900 mt-1">Zone-specific overrides take priority over city defaults.</p>
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Dynamic Surge</p>
                        <p className="text-sm font-bold text-amber-900 mt-1">Surge and Peak multipliers apply on top of matrix rates.</p>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-[32px] overflow-hidden border border-white/40 shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vehicle / Body</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Region / Zone</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Base Logic</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Variable Rates</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Split</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {pricing.map((item) => (
                                <tr key={item._id} className="hover:bg-cyan-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold group-hover:bg-cyan-500 group-hover:text-white transition-all">
                                                {item.vehicle_type === '2w' ? '2W' : item.vehicle_type === '3w' ? '3W' : 'TK'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 uppercase">{item.vehicle_type}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.vehicle_body_type || 'Generic'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{item.city}</span>
                                            {item.delivery_zone ? (
                                                <span className="text-[10px] font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md inline-block w-fit mt-1 uppercase tracking-tighter">
                                                    Zone: {item.delivery_zone.name}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 italic mt-1">City Default</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800">₹{item.base_fare}</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Incl. first {item.base_km || 2} KM</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-600">KM:</span>
                                                <span className="text-sm font-black text-indigo-600">₹{item.per_km_rate}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-600">MIN:</span>
                                                <span className="text-sm font-black text-emerald-600">₹{item.per_min_rate}</span>
                                            </div>
                                            {item.max_distance_km > 0 && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase">Max: {item.max_distance_km} KM</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full w-fit">
                                            <LayoutGrid className="w-3 h-3 text-slate-500" />
                                            <span className="text-xs font-black text-slate-700">{item.platform_commission_percent}% Fee</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => openEdit(item)}
                                                className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item._id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {editingItem ? 'Update Pricing Rule' : 'New Pricing Rule'}
                                </h3>
                                <p className="text-slate-500 text-sm font-medium mt-1">Configure vehicle rates for a specific region.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Geography */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Geography
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">City</label>
                                            <input 
                                                type="text" 
                                                value={formData.city}
                                                onChange={e => setFormData({...formData, city: e.target.value})}
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Delivery Zone (Optional Geofence)</label>
                                            <select 
                                                value={formData.delivery_zone}
                                                onChange={e => setFormData({...formData, delivery_zone: e.target.value})}
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="">City Hub Default</option>
                                                {zones.map(z => (
                                                    <option key={z._id} value={z._id}>{z.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Truck className="w-3 h-3" /> Vehicle Class
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Type</label>
                                            <select 
                                                value={formData.vehicle_type}
                                                onChange={e => setFormData({...formData, vehicle_type: e.target.value})}
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="2w">2 Wheeler (Bike)</option>
                                                <option value="3w">3 Wheeler (Auto)</option>
                                                <option value="truck">Truck / LCV</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Body Type</label>
                                            <select 
                                                value={formData.vehicle_body_type}
                                                onChange={e => setFormData({...formData, vehicle_body_type: e.target.value})}
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="all">All Body Types</option>
                                                <option value="open">Open Body</option>
                                                <option value="closed">Closed / Box</option>
                                                <option value="refrigerated">Refrigerated</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Rates */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Fare Breakdown Configuration
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Base Fare (₹)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={formData.base_fare}
                                                onChange={e => setFormData({...formData, base_fare: Number(e.target.value)})}
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                                                required
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">₹</div>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Included Distance (Base KM)</label>
                                        <input 
                                            type="number" 
                                            value={formData.base_km}
                                            onChange={e => setFormData({...formData, base_km: Number(e.target.value)})}
                                            className="w-full mt-1 bg-cyan-50/50 border border-cyan-100 rounded-xl px-4 py-3 text-lg font-black text-cyan-800 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                                            required
                                        />
                                        <p className="text-[9px] font-bold text-cyan-600 mt-2 uppercase tracking-tight italic">Rate per KM applies AFTER this distance.</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Per KM Rate</label>
                                        <input 
                                            type="number" 
                                            value={formData.per_km_rate}
                                            onChange={e => setFormData({...formData, per_km_rate: Number(e.target.value)})}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Per Min Rate</label>
                                        <input 
                                            type="number" 
                                            value={formData.per_min_rate}
                                            onChange={e => setFormData({...formData, per_min_rate: Number(e.target.value)})}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Min Fare (Total)</label>
                                        <input 
                                            type="number" 
                                            value={formData.min_fare}
                                            onChange={e => setFormData({...formData, min_fare: Number(e.target.value)})}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Max Distance (KM)</label>
                                        <input 
                                            type="number" 
                                            value={formData.max_distance_km}
                                            onChange={e => setFormData({...formData, max_distance_km: Number(e.target.value)})}
                                            className="w-full mt-1 bg-rose-50/30 border border-rose-100 rounded-xl px-4 py-3 text-sm font-black text-rose-700 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                                            required
                                        />
                                        <p className="text-[8px] font-bold text-rose-400 mt-1 uppercase tracking-tighter">0 = No Limit</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Commission (%)</label>
                                        <input 
                                            type="number" 
                                            value={formData.platform_commission_percent}
                                            onChange={e => setFormData({...formData, platform_commission_percent: Number(e.target.value)})}
                                            className="w-full mt-1 bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3 text-sm font-black text-indigo-700"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-2 px-12 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/30 hover:bg-cyan-600 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Commit Pricing Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
