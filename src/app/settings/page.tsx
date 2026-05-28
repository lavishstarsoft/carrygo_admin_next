"use client";
import React, { useEffect, useState } from "react";
import { apiUrl } from "@/utils/api";

interface OptionItem {
    id: string;
    label: string;
    icon?: string;
}

interface OptionList {
    key: string;
    label: string;
    hasIcon: boolean;
    options: OptionItem[];
}

interface VehicleType {
    id: string;
    label: string;
    icon: string;
    optionLists: OptionList[];
}

/**
 * Migrate legacy vehicleType (bodyTypes/fuelTypes arrays) into the new
 * generic optionLists format so existing data keeps working.
 */
function migrateVehicleType(v: any): VehicleType {
    if (v.optionLists) return v as VehicleType;

    const optionLists: OptionList[] = [];

    if (v.bodyTypes && v.bodyTypes.length > 0) {
        optionLists.push({
            key: "bodyTypes",
            label: "Vehicle Body Type",
            hasIcon: true,
            options: v.bodyTypes.map((b: any) => ({ id: b.id, label: b.label, icon: b.icon || "" })),
        });
    }

    if (v.fuelTypes && v.fuelTypes.length > 0) {
        optionLists.push({
            key: "fuelTypes",
            label: "Fuel Type",
            hasIcon: false,
            options: v.fuelTypes.map((f: any) => ({ id: f.id, label: f.label })),
        });
    }

    return { id: v.id, label: v.label, icon: v.icon, optionLists };
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [cities, setCities] = useState<string[]>([]);
    const [newCity, setNewCity] = useState("");

    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

    // Track which vehicle card is expanded
    const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null);

    // Drag and Drop state
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${apiUrl}/settings/app_settings`);

                if (!res.ok) throw new Error("Failed to fetch settings");

                const data = await res.json();
                if (data && data.value) {
                    setCities(data.value.cities || []);
                    const rawVehicles = data.value.vehicleTypes || [];
                    setVehicleTypes(rawVehicles.map(migrateVehicleType));
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccessMsg("");

        try {
            const payload = {
                value: {
                    cities,
                    vehicleTypes
                }
            };

            const res = await fetch(`${apiUrl}/settings/app_settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save settings");

            setSuccessMsg("Settings saved successfully!");
            setTimeout(() => setSuccessMsg(""), 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── City helpers ───────────────────────────────────
    const addCity = () => {
        if (!newCity.trim()) return;
        if (!cities.includes(newCity.trim())) {
            setCities([...cities, newCity.trim()]);
        }
        setNewCity("");
    };
    const removeCity = (cityToRemove: string) => {
        setCities(cities.filter(c => c !== cityToRemove));
    };

    // ─── Vehicle helpers ────────────────────────────────
    const updateVehicle = (index: number, field: string, value: string) => {
        const updated = [...vehicleTypes];
        updated[index] = { ...updated[index], [field]: value };
        setVehicleTypes(updated);
    };

    const removeVehicle = (index: number) => {
        const updated = [...vehicleTypes];
        updated.splice(index, 1);
        setVehicleTypes(updated);
        if (expandedVehicle === index) setExpandedVehicle(null);
    };

    const addVehicle = () => {
        setVehicleTypes([...vehicleTypes, { id: "new", label: "New Vehicle", icon: "❓", optionLists: [] }]);
        setExpandedVehicle(vehicleTypes.length);
    };

    // ─── Option List helpers ────────────────────────────
    const addOptionList = (vIdx: number) => {
        const updated = [...vehicleTypes];
        updated[vIdx].optionLists.push({
            key: `custom_${Date.now()}`,
            label: "New Option",
            hasIcon: false,
            options: [],
        });
        setVehicleTypes(updated);
    };

    const removeOptionList = (vIdx: number, olIdx: number) => {
        const updated = [...vehicleTypes];
        updated[vIdx].optionLists.splice(olIdx, 1);
        setVehicleTypes(updated);
    };

    const updateOptionList = (vIdx: number, olIdx: number, field: keyof OptionList, value: any) => {
        const updated = [...vehicleTypes];
        (updated[vIdx].optionLists[olIdx] as any)[field] = value;
        setVehicleTypes(updated);
    };

    const moveOptionList = (vIdx: number, fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        const updated = [...vehicleTypes];
        const lists = [...updated[vIdx].optionLists];
        const [movedItem] = lists.splice(fromIdx, 1);
        lists.splice(toIdx, 0, movedItem);
        updated[vIdx].optionLists = lists;
        setVehicleTypes(updated);
    };

    // ─── Drag handlers ────────────────────────────
    const handleDragStart = (idx: number) => {
        setDraggingIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggingIdx === null || draggingIdx === idx) return;
        // Optionally add visual feedback here
    };

    const handleDrop = (vIdx: number, targetIdx: number) => {
        if (draggingIdx === null) return;
        moveOptionList(vIdx, draggingIdx, targetIdx);
        setDraggingIdx(null);
    };

    // ─── Option Item helpers ────────────────────────────
    const addOptionItem = (vIdx: number, olIdx: number) => {
        const updated = [...vehicleTypes];
        const ol = updated[vIdx].optionLists[olIdx];
        ol.options.push({ id: "new", label: "New Item", icon: ol.hasIcon ? "📦" : undefined });
        setVehicleTypes(updated);
    };

    const removeOptionItem = (vIdx: number, olIdx: number, itemIdx: number) => {
        const updated = [...vehicleTypes];
        updated[vIdx].optionLists[olIdx].options.splice(itemIdx, 1);
        setVehicleTypes(updated);
    };

    const updateOptionItem = (vIdx: number, olIdx: number, itemIdx: number, field: string, value: string) => {
        const updated = [...vehicleTypes];
        (updated[vIdx].optionLists[olIdx].options[itemIdx] as any)[field] = value;
        setVehicleTypes(updated);
    };

    // ─── Render ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            {/* ─── Top Bar ─────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Master Settings</h2>
                    <p className="text-sm text-slate-400 mt-1">Configure dynamic app data like operational cities, vehicle types, and custom options.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>💾 Save Changes</>
                    )}
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    ✅ {successMsg}
                </div>
            )}

            {/* ─── Cities ──────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    🏙️ Operational Cities
                </h3>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCity()}
                        placeholder="Add a new city..."
                        className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        onClick={addCity}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm transition"
                    >
                        Add
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {cities.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4 w-full border border-dashed border-slate-200 rounded-lg">No cities configured.</p>
                    ) : (
                        cities.map(city => (
                            <div key={city} className="flex items-center gap-2 border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-full">
                                <span className="text-sm font-medium text-slate-700">{city}</span>
                                <button
                                    onClick={() => removeCity(city)}
                                    className="text-red-400 hover:text-red-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ─── Vehicle Types ────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        🚚 Vehicle Types
                    </h3>
                    <button
                        onClick={addVehicle}
                        className="text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium transition"
                    >
                        + Add Vehicle Type
                    </button>
                </div>

                <div className="space-y-4">
                    {vehicleTypes.map((v, vIdx) => {
                        const isExpanded = expandedVehicle === vIdx;

                        return (
                            <div key={vIdx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* ─── Vehicle Header (always visible) ─── */}
                                <div
                                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
                                    onClick={() => setExpandedVehicle(isExpanded ? null : vIdx)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{v.icon}</span>
                                        <div>
                                            <p className="font-semibold text-slate-800">{v.label}</p>
                                            <p className="text-xs text-slate-400">ID: {v.id} · {v.optionLists.length} option list{v.optionLists.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeVehicle(vIdx); }}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-semibold transition"
                                        >
                                            Delete
                                        </button>
                                        <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {/* ─── Vehicle Details (expandable) ─── */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-slate-100">
                                        {/* Basic fields */}
                                        <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Internal ID</label>
                                                <input
                                                    type="text"
                                                    value={v.id}
                                                    onChange={(e) => updateVehicle(vIdx, 'id', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                    placeholder="e.g. 2w"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Display Label</label>
                                                <input
                                                    type="text"
                                                    value={v.label}
                                                    onChange={(e) => updateVehicle(vIdx, 'label', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                    placeholder="e.g. 2 Wheeler"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Icon (Emoji)</label>
                                                <input
                                                    type="text"
                                                    value={v.icon}
                                                    onChange={(e) => updateVehicle(vIdx, 'icon', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                                                    placeholder="e.g. 🛵"
                                                />
                                            </div>
                                        </div>

                                        {/* ─── Option Lists ─────────────── */}
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-bold text-slate-700">📋 Option Lists</h4>
                                            <button
                                                onClick={() => addOptionList(vIdx)}
                                                className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition"
                                            >
                                                + Add Option List
                                            </button>
                                        </div>

                                        {v.optionLists.length === 0 ? (
                                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                                                <p className="text-sm text-slate-400">No option lists yet. Click &quot;+ Add Option List&quot; to add body types, fuel types, or any custom option.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {v.optionLists.map((ol, olIdx) => (
                                                    <div
                                                        key={ol.key + olIdx}
                                                        draggable
                                                        onDragStart={() => handleDragStart(olIdx)}
                                                        onDragOver={(e) => handleDragOver(e, olIdx)}
                                                        onDrop={() => handleDrop(vIdx, olIdx)}
                                                        onDragEnd={() => setDraggingIdx(null)}
                                                        className={`border border-slate-200 rounded-lg bg-slate-50 p-4 transition-all ${draggingIdx === olIdx ? 'opacity-40 scale-[0.98]' : 'opacity-100'}`}
                                                    >
                                                        {/* Option List header */}
                                                        <div className="flex items-start gap-3 mb-3">
                                                            {/* Drag Handle */}
                                                            <div className="mt-2 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 transition-colors">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></svg>
                                                            </div>
                                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">Key (internal)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={ol.key}
                                                                        onChange={(e) => updateOptionList(vIdx, olIdx, 'key', e.target.value)}
                                                                        className="w-full border border-slate-200 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                                                        placeholder="e.g. bodyTypes"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">Label (shown in app)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={ol.label}
                                                                        onChange={(e) => updateOptionList(vIdx, olIdx, 'label', e.target.value)}
                                                                        className="w-full border border-slate-200 rounded text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                                                        placeholder="e.g. Vehicle Body Type"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-4">
                                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={ol.hasIcon}
                                                                        onChange={(e) => updateOptionList(vIdx, olIdx, 'hasIcon', e.target.checked)}
                                                                        className="rounded border-slate-300"
                                                                    />
                                                                    Icons
                                                                </label>
                                                                <button
                                                                    onClick={() => removeOptionList(vIdx, olIdx)}
                                                                    className="text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded text-xs font-bold"
                                                                    title="Remove this option list"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Option Items */}
                                                        <div className="space-y-1.5">
                                                            {ol.options.length === 0 ? (
                                                                <p className="text-xs text-slate-400 italic py-1">No items. Click + Add Item below.</p>
                                                            ) : (
                                                                ol.options.map((item, itemIdx) => (
                                                                    <div key={itemIdx} className="flex gap-2 items-center">
                                                                        <input
                                                                            type="text"
                                                                            value={item.id}
                                                                            onChange={(e) => updateOptionItem(vIdx, olIdx, itemIdx, 'id', e.target.value)}
                                                                            className="w-1/4 border border-slate-200 rounded text-xs px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-500"
                                                                            placeholder="ID"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={item.label}
                                                                            onChange={(e) => updateOptionItem(vIdx, olIdx, itemIdx, 'label', e.target.value)}
                                                                            className={`${ol.hasIcon ? 'w-2/4' : 'w-3/4'} border border-slate-200 rounded text-xs px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-500`}
                                                                            placeholder="Label"
                                                                        />
                                                                        {ol.hasIcon && (
                                                                            <input
                                                                                type="text"
                                                                                value={item.icon || ''}
                                                                                onChange={(e) => updateOptionItem(vIdx, olIdx, itemIdx, 'icon', e.target.value)}
                                                                                className="w-1/4 border border-slate-200 rounded text-xs px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-500"
                                                                                placeholder="Icon"
                                                                            />
                                                                        )}
                                                                        <button
                                                                            onClick={() => removeOptionItem(vIdx, olIdx, itemIdx)}
                                                                            className="text-red-400 hover:text-red-600 font-bold px-1 text-sm"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => addOptionItem(vIdx, olIdx)}
                                                            className="mt-2 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded font-medium hover:bg-indigo-100 transition"
                                                        >
                                                            + Add Item
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {vehicleTypes.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center mt-4">
                        <p className="text-sm text-slate-400">No vehicle types configured. Click &quot;+ Add Vehicle Type&quot; to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
