"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { apiUrl } from "@/utils/api";
import {
    GoogleMap, DrawingManager,
    Polygon, Circle
} from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import MapsSetupHelp from "@/components/MapsSetupHelp";
import { 
    Plus, Search, Edit2, Trash2, 
    Map as MapIcon, ChevronRight, Eye,
    CheckCircle2, XCircle, Info, Target, Hexagon,
    ArrowLeft, Palette, Save, X, DollarSign, Clock, ShoppingBag, 
    Smartphone, Filter, Pentagon, Circle as CircleIcon, MapPin
} from "lucide-react";

const libraries: ("drawing" | "geometry" | "places")[] = ["drawing", "geometry", "places"];

const PRESET_COLORS = [
    { name: "Cyan", value: "#0891b2" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Emerald", value: "#10b981" },
    { name: "Slate", value: "#475569" }
];

export default function DeliveryZones() {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<any>(null);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
    
    // Map Config
    const mapRef = useRef<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState({ lat: 16.5062, lng: 80.6480 }); // Vijayawada

    const { isLoaded, loadError, authFailed } = useGoogleMaps();

    // Location Search (Places Autocomplete)
    const [locationQuery, setLocationQuery] = useState("");
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Initialize Places services once map is loaded
    useEffect(() => {
        if (isLoaded && window.google) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
    }, [isLoaded]);

    // Close predictions dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setShowPredictions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLocationSearch = (value: string) => {
        setLocationQuery(value);
        if (!value.trim() || !autocompleteServiceRef.current) {
            setPredictions([]);
            setShowPredictions(false);
            return;
        }
        autocompleteServiceRef.current.getPlacePredictions(
            { input: value, componentRestrictions: { country: 'in' } },
            (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setShowPredictions(true);
                } else {
                    setPredictions([]);
                }
            }
        );
    };

    const handleSelectPrediction = (placeId: string, description: string) => {
        setLocationQuery(description);
        setShowPredictions(false);
        setPredictions([]);

        if (!mapRef.current) return;
        if (!placesServiceRef.current) {
            placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
        }
        placesServiceRef.current.getDetails(
            { placeId, fields: ['geometry'] },
            (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    setMapCenter(loc);
                    mapRef.current?.panTo(loc);
                    mapRef.current?.setZoom(15);
                }
            }
        );
    };

    const fetchZones = async () => {
        try {
            const res = await fetch(`${apiUrl}/fare/zones`);
            if (res.ok) {
                const data = await res.json();
                setZones(data);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchZones(); }, []);

    // Helper: Area Calculation
    const calculateAreaInSqKm = (zone: any) => {
        if (!isLoaded || !window.google) return 0;
        try {
            if (zone.type === 'circle') {
                return (Math.PI * Math.pow(zone.radius / 1000, 2)).toFixed(2);
            }
            if (zone.type === 'polygon' && zone.coordinates) {
                const paths = zone.coordinates.map((c: any) => new window.google.maps.LatLng(c.lat, c.lng));
                const areaInSqMeters = window.google.maps.geometry.spherical.computeArea(paths);
                return (areaInSqMeters / 1000000).toFixed(2);
            }
        } catch (e) { return 0; }
        return 0;
    };

    const calculatePerimeterInKm = (zone: any) => {
        if (!isLoaded || !window.google || zone.type !== 'polygon' || !zone.coordinates) return 0;
        try {
            const paths = zone.coordinates.map((c: any) => new window.google.maps.LatLng(c.lat, c.lng));
            const lengthInMeters = window.google.maps.geometry.spherical.computeLength(paths);
            return (lengthInMeters / 1000).toFixed(2);
        } catch (e) { return 0; }
    };

    // ─── Event Handlers ──────────────────────────────────────────────────────
    const handleAddZone = () => {
        setSelectedZone({
            name: "",
            description: "",
            type: "polygon",
            coordinates: [],
            center: null,
            radius: 0,
            color: "#06b6d4",
            isActive: true,
            delivery_fee: 0,
            min_order: 0,
            free_delivery_above: 0,
            est_delivery_time: "2-3 days"
        });
        setView('edit');
        setIsDrawing(false);
    };

    const handleEditZone = (zone: any) => {
        setSelectedZone({ ...zone });
        let center = null;
        if (zone.type === 'circle' && zone.center) center = zone.center;
        else if (zone.type === 'polygon' && zone.coordinates.length > 0) center = zone.coordinates[0];
        
        if (center) setMapCenter(center);
        setView('edit');
        setIsDrawing(false);
    };

    const onPolygonComplete = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        const coords: { lat: number; lng: number }[] = [];
        for (let i = 0; i < path.getLength(); i++) {
            coords.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
        }
        setSelectedZone((prev: any) => ({ ...prev, type: "polygon", coordinates: coords }));
        setIsDrawing(false);
        setDrawingMode(null);
        polygon.setMap(null);
    };

    const onCircleComplete = (circle: google.maps.Circle) => {
        const center = circle.getCenter();
        const radius = circle.getRadius();
        setSelectedZone((prev: any) => ({ 
            ...prev, 
            type: "circle", 
            center: { lat: center?.lat(), lng: center?.lng() }, 
            radius: radius 
        }));
        setIsDrawing(false);
        setDrawingMode(null);
        circle.setMap(null);
    };

    const handleSave = async () => {
        if (!selectedZone.name) return alert("Zone Name is required.");
        if (selectedZone.type === 'polygon' && selectedZone.coordinates.length === 0) return alert("Please draw the polygon on the map.");
        if (selectedZone.type === 'circle' && !selectedZone.center) return alert("Please draw the circle on the map.");

        try {
            const res = await fetch(`${apiUrl}/fare/zones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...selectedZone, id: selectedZone._id })
            });
            if (res.ok) {
                setView('list');
                fetchZones();
            }
        } catch (err) { alert("Save failed"); }
    };

    const handleToggleActive = async (zone: any) => {
        try {
            const updated = { ...zone, isActive: !zone.isActive, id: zone._id };
            await fetch(`${apiUrl}/fare/zones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated)
            });
            fetchZones();
        } catch (err) { console.error(err); }
    };

    const handleViewZone = (zone: any) => {
        let center = null;
        if (zone.type === 'circle' && zone.center) {
            center = zone.center;
        } else if (zone.type === 'polygon' && zone.coordinates.length > 0) {
            center = zone.coordinates[0];
        }

        if (center && mapRef.current) {
            mapRef.current.panTo(center);
            mapRef.current.setZoom(14);
            // Smoothly scroll to map if on mobile
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this zone?")) return;
        try {
            await fetch(`${apiUrl}/fare/zones/${id}`, { method: "DELETE" });
            fetchZones();
        } catch (err) { console.error(err); }
    };

    if (loadError || authFailed) {
        return (
            <MapsSetupHelp
                title="Delivery zones map unavailable"
                detail={loadError?.message || "Enable billing + Maps JavaScript API + Places API on Google Cloud."}
            />
        );
    }
    if (!isLoaded) return <div className="p-10 text-slate-400 font-bold animate-pulse">Loading Map Services...</div>;

    const filteredZones = zones
        .filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(z => {
            if (filterStatus === 'Active') return z.isActive;
            if (filterStatus === 'Inactive') return !z.isActive;
            return true;
        });
    const activeZonesCount = zones.filter(z => z.isActive).length;
    const polygonCount = zones.filter(z => z.type === 'polygon').length;
    const circleCount = zones.filter(z => z.type === 'circle').length;

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
            {view === 'list' ? (
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <span>Dashboard</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-slate-600 font-bold">Delivery Zones</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Delivery Zones</h1>
                        </div>
                        <button 
                            onClick={handleAddZone}
                            className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-900/10"
                        >
                            <Plus className="w-5 h-5" />
                            Add Zone
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
                                <MapIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">{zones.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Zones</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">{activeZonesCount}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Active Zones</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                                <Target className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none">{polygonCount} / {circleCount}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Polygon / Circle</p>
                            </div>
                        </div>
                    </div>

                    {/* Inline Map Card */}
                    <div className="bg-white rounded-[32px] p-4 shadow-sm border border-slate-100 h-[450px] overflow-hidden relative group">
                        <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%", borderRadius: '24px' }}
                            center={mapCenter}
                            zoom={12}
                            onLoad={map => { mapRef.current = map; }}
                            options={{
                                mapTypeId: 'roadmap',
                                styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }],
                                disableDefaultUI: false,
                            }}
                        >
                            {zones.map(zone => (
                                <React.Fragment key={zone._id}>
                                    {zone.type === 'circle' ? (
                                        <Circle 
                                            center={zone.center} 
                                            radius={zone.radius} 
                                            options={{ fillColor: zone.color, fillOpacity: 0.15, strokeColor: zone.color, strokeWeight: 2 }} 
                                        />
                                    ) : (
                                        <Polygon 
                                            paths={zone.coordinates} 
                                            options={{ fillColor: zone.color, fillOpacity: 0.15, strokeColor: zone.color, strokeWeight: 2 }} 
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </GoogleMap>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            <input 
                                type="text" 
                                placeholder="Search by zone name..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8b0303]/10"
                            />
                        </div>
                        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                            {['All', 'Active', 'Inactive'].map((opt: any) => (
                                <button 
                                    key={opt} 
                                    onClick={() => setFilterStatus(opt)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === opt ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{opt}</button>
                            ))}
                        </div>
                    </div>

                    {/* Zones Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {filteredZones.map(zone => (
                            <div key={zone._id} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 group hover:shadow-xl hover:border-red-100 transition-all">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full border-2 border-slate-200 shadow-inner" style={{ backgroundColor: zone.color }}></div>
                                        <h3 className="text-xl font-black text-slate-800">{zone.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleViewZone(zone)}
                                            className="p-2.5 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleActive(zone)}
                                            className={`p-2.5 rounded-xl transition-colors ${zone.isActive ? 'hover:bg-emerald-50 text-emerald-500' : 'hover:bg-rose-50 text-rose-500'}`}
                                        >
                                            {zone.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleEditZone(zone)} className="p-2.5 hover:bg-slate-50 text-slate-400 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(zone._id)} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <span className="bg-slate-50 text-slate-500 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{zone.type}</span>
                                    <span className="bg-slate-50 text-slate-500 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">
                                        {zone.type === 'circle' 
                                            ? `${(zone.radius / 1000).toFixed(2)} km radius` 
                                            : `${calculatePerimeterInKm(zone)} km perimeter (${calculateAreaInSqKm(zone)} km²)`}
                                    </span>
                                    <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest ${zone.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {zone.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500 pb-20">
                    {/* Breadcrumbs for Edit */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setView('list')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
                                <ArrowLeft className="w-5 h-5 text-[#8b0303]" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                    <span>Dashboard</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span>Delivery Zones</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="text-slate-600 font-bold">New</span>
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Delivery Zone</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('list')} className="bg-white border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50">Cancel</button>
                            <button onClick={handleSave} className="bg-cyan-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-cyan-900/10 flex items-center gap-3 hover:bg-cyan-700 transition-all">
                                <Save className="w-4 h-4" />
                                {selectedZone._id ? 'Update Zone' : 'Create Zone'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left Column: Form Tools */}
                        <div className="xl:col-span-2 space-y-8">
                            {/* Search Location Card */}
                            <div className="bg-white rounded-[32px] p-4 shadow-sm border border-slate-100" ref={searchContainerRef}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input 
                                        type="text" 
                                        placeholder="Search for a location..." 
                                        value={locationQuery}
                                        onChange={e => handleLocationSearch(e.target.value)}
                                        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                                        className="w-full bg-slate-50/50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:outline-none"
                                    />
                                    {showPredictions && predictions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                            {predictions.map((p) => (
                                                <button
                                                    key={p.place_id}
                                                    onClick={() => handleSelectPrediction(p.place_id, p.description)}
                                                    className="w-full text-left px-5 py-3.5 hover:bg-cyan-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-none"
                                                >
                                                    <MapPin className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700">{p.structured_formatting.main_text}</p>
                                                        <p className="text-xs text-slate-400">{p.structured_formatting.secondary_text}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Drawing Mode Selector */}
                            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-6">
                                    <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Draw:</p>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => { setIsDrawing(true); setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON); }}
                                            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${drawingMode === 'polygon' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-cyan-600/30'}`}
                                        >
                                            <Pentagon className="w-4 h-4" />
                                            Polygon
                                        </button>
                                        <button 
                                            onClick={() => { setIsDrawing(true); setDrawingMode(window.google.maps.drawing.OverlayType.CIRCLE); }}
                                            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${drawingMode === 'circle' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-cyan-600/30'}`}
                                        >
                                            <CircleIcon className="w-4 h-4" />
                                            Circle
                                        </button>
                                    </div>
                                </div>
                                {!isDrawing && !selectedZone.coordinates.length && !selectedZone.center && (
                                    <div className="mt-6 bg-blue-50 text-blue-700 px-6 py-4 rounded-2xl flex items-center gap-3 border border-blue-100">
                                        <Info className="w-5 h-5" />
                                        <p className="text-xs font-bold">Select <span className="font-black">Polygon</span> or <span className="font-black">Circle</span> above to start drawing a delivery zone on the map.</p>
                                    </div>
                                )}
                            </div>

                            {/* Embedded Map Card */}
                            <div className="bg-white rounded-[40px] p-2 shadow-sm border border-slate-100 h-[600px] overflow-hidden relative">
                                <GoogleMap
                                    mapContainerStyle={{ width: "100%", height: "100%", borderRadius: '32px' }}
                                    center={mapCenter}
                                    zoom={13}
                                    onLoad={map => { mapRef.current = map; }}
                                    options={{
                                        mapTypeId: 'roadmap',
                                        styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }],
                                    }}
                                >
                                    {isDrawing && (
                                        <DrawingManager
                                            onPolygonComplete={onPolygonComplete}
                                            onCircleComplete={onCircleComplete}
                                            drawingMode={drawingMode}
                                            options={{
                                                drawingControl: false,
                                                polygonOptions: { fillColor: selectedZone.color, fillOpacity: 0.3, strokeWeight: 3, strokeColor: selectedZone.color, clickable: false, editable: false },
                                                circleOptions: { fillColor: selectedZone.color, fillOpacity: 0.3, strokeWeight: 3, strokeColor: selectedZone.color, clickable: false, editable: false }
                                            }}
                                        />
                                    )}

                                    {/* Selected Zone Layers */}
                                    {selectedZone?.type === 'circle' && selectedZone?.center && selectedZone?.radius > 0 && (
                                        <Circle 
                                            center={selectedZone.center} 
                                            radius={selectedZone.radius} 
                                            options={{ fillColor: selectedZone.color, fillOpacity: 0.3, strokeColor: selectedZone.color, strokeWeight: 4, editable: true, draggable: true }}
                                        />
                                    )}
                                    {selectedZone?.type === 'polygon' && selectedZone?.coordinates?.length > 0 && (
                                        <Polygon 
                                            paths={selectedZone.coordinates} 
                                            options={{ fillColor: selectedZone.color, fillOpacity: 0.3, strokeColor: selectedZone.color, strokeWeight: 4, editable: true, draggable: true }}
                                        />
                                    )}
                                </GoogleMap>
                            </div>
                        </div>

                        {/* Right Column: Settings Sections */}
                        <div className="space-y-8">
                            {/* Section 1: Zone Details */}
                            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                                <div className="bg-[#2962ff] p-6 text-white flex items-center gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-2xl"><MapPin className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest">Zone Details</h3>
                                        <p className="text-[10px] opacity-70">NAME & DESCRIPTION</p>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Name *</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g., Vijayawada Core" 
                                            value={selectedZone.name}
                                            onChange={e => setSelectedZone({...selectedZone, name: e.target.value})}
                                            className="w-full mt-3 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea 
                                            placeholder="Optional zone description..." 
                                            value={selectedZone.description}
                                            onChange={e => setSelectedZone({...selectedZone, description: e.target.value})}
                                            className="w-full mt-3 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium h-32 resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Coverage Analysis */}
                            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                                <div className="bg-[#00bfa5] p-6 text-white flex items-center gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-2xl"><Target className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest">Coverage Analysis</h3>
                                        <p className="text-[10px] opacity-70">REAL-TIME SIZE CALCULATION</p>
                                    </div>
                                </div>
                                <div className="p-8">
                                    {(!selectedZone.center && selectedZone.coordinates.length === 0) ? (
                                        <p className="text-xs font-bold text-slate-400 text-center py-4 italic">No area data. Draw on the map to see stats.</p>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estimated Coverage</p>
                                                    <p className="text-2xl font-black text-slate-900 mt-1">
                                                        {selectedZone.type === 'circle' 
                                                            ? `${(selectedZone.radius / 1000).toFixed(2)} km` 
                                                            : `${calculatePerimeterInKm(selectedZone)} km`}
                                                    </p>
                                                    {selectedZone.type === 'polygon' && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1">Area: {calculateAreaInSqKm(selectedZone)} km²</p>
                                                    )}
                                                </div>
                                                <div className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                                                    {selectedZone.type === 'circle' ? 'Linear Radius' : 'Boundary Length'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Appearance & Status */}
                            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                                <div className="bg-[#9c27b0] p-6 text-white flex items-center gap-4">
                                    <div className="bg-white/10 p-2.5 rounded-2xl"><Palette className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest">Appearance & Status</h3>
                                        <p className="text-[10px] opacity-70">COLOR & ACTIVE TOGGLE</p>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Color</label>
                                        <div className="mt-4 flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                            <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: selectedZone.color }}></div>
                                            <input 
                                                type="text" 
                                                value={selectedZone.color} 
                                                onChange={e => setSelectedZone({...selectedZone, color: e.target.value})}
                                                className="bg-transparent border-none text-sm font-bold tracking-widest focus:ring-0 flex-1"
                                            />
                                            <input 
                                                type="color" 
                                                value={selectedZone.color} 
                                                onChange={e => setSelectedZone({...selectedZone, color: e.target.value})}
                                                className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                                        <div className="flex gap-4">
                                            <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl"><CheckCircle2 className="w-5 h-5" /></div>
                                            <div>
                                                <p className="text-sm font-black">Zone Active</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Enable this zone for delivery</p>
                                            </div>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedZone.isActive} 
                                                onChange={e => setSelectedZone({...selectedZone, isActive: e.target.checked})}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
