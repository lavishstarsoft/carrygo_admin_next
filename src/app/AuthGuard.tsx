"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { io } from "socket.io-client";

// Dynamic SVG Icons
const LayoutDashboard = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
);
const Users = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const Package = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
const ShieldCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /><path d="m9 12 2 2 4-4" /></svg>
);
const Settings = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const LogOut = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
);
const Search = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const UserCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);
const Bell = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const Menu = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
);
const PanelLeftClose = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="9" x2="9" y1="3" y2="21" /><path d="m16 15-3-3 3-3" /></svg>
);
const PanelLeftOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="9" x2="9" y1="3" y2="21" /><path d="m13 15 3-3-3-3" /></svg>
);

const MapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M9 3.5v13" /><path d="M15 7.5v13" /></svg>
);
const Banknote = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
);

const NAV_ITEMS = [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard /> },
    { label: "Fleet Drivers", path: "/drivers", icon: <Users /> },
    { label: "Customers", path: "/users", icon: <UserCircle /> },
    { label: "Logistics Orders", path: "/orders", icon: <Package /> },
    { label: "Delivery Zones", path: "/delivery-zones", icon: <MapIcon /> },
    { label: "Pricing Matrix", path: "/pricing", icon: <Banknote /> },
    { label: "KYC Verification", path: "/kyc", icon: <ShieldCheck /> },
    { label: "System Config", path: "/settings", icon: <Settings /> },
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
        if (!token && pathname !== "/login") {
            router.push("/login");
        } else if (token && pathname === "/login") {
            router.push("/");
        } else {
            setIsAuthenticated(true);
        }
    }, [pathname, router]);

    // Setup Socket.io and fetch initial notifications
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchNotifications = async () => {
            try {
                const res = await fetch("http://localhost:4000/api/notifications");
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                    setUnreadCount(data.filter((n: any) => !n.isRead).length);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        fetchNotifications();

        const socket = io("http://localhost:4000");

        socket.on("new_notification", (notification: any) => {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: any) => {
        // Mark as read in backend
        if (!notification.isRead) {
            try {
                await fetch(`http://localhost:4000/api/notifications/${notification._id}/read`, {
                    method: 'PUT'
                });

                setNotifications(prev => prev.map(n =>
                    n._id === notification._id ? { ...n, isRead: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error("Failed to mark as read", err);
            }
        }

        setShowNotifications(false);
        // Redirect logic based on notification type
        if (notification.type === 'driver_registered') {
            router.push('/kyc');
        } else if (notification.type === 'order_placed') {
            router.push('/orders');
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('http://localhost:4000/api/notifications/read-all', { method: 'PUT' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    // Format current date
    const currentDate = new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(new Date());

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-cyan-400 text-sm font-bold tracking-widest uppercase animate-pulse">Initializing System...</p>
                </div>
            </div>
        );
    }

    if (pathname === "/login") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-900">
            {/* Overlay for mobile */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Premium Dark Sidebar */}
            <aside className={`
                ${sidebarCollapsed ? 'lg:w-[80px]' : 'lg:w-[280px]'} 
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                dark-glass flex flex-col transition-all duration-300 fixed h-screen z-50 overflow-hidden
            `}>
                {/* Decorative glow inside sidebar */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                {/* Logo Area */}
                <div className="h-20 px-6 border-b border-slate-700/50 flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_15px_rgba(34,211,238,0.4)] flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                        CG
                    </div>
                    {(!sidebarCollapsed || mobileMenuOpen) && (
                        <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                            <h1 className="text-xl font-black text-white tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">CarryGo</h1>
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em] mt-1 shadow-cyan-400/20">Logistics Core</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
                    {(!sidebarCollapsed || mobileMenuOpen) && (
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-3 mb-4">Operations</p>
                    )}
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    router.push(item.path);
                                    setMobileMenuOpen(false);
                                }}
                                className={`
                                    w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                                    ${isActive
                                        ? 'text-white shadow-lg shadow-cyan-900/20 bg-gradient-to-r from-cyan-500/20 to-blue-600/10 border border-cyan-500/30'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                                    }
                                `}
                                title={item.label}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee]"></div>
                                )}
                                <span className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'group-hover:scale-110 group-hover:text-slate-200'}`}>
                                    {item.icon}
                                </span>
                                {(!sidebarCollapsed || mobileMenuOpen) && (
                                    <span className="flex-1 text-left whitespace-nowrap tracking-wide">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 relative z-10">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex w-full items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all group"
                        title={sidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                        </span>
                        {!sidebarCollapsed && <span>Collapse Sidebar</span>}
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem("adminToken");
                            router.push("/login");
                        }}
                        className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all group mt-2 border border-transparent hover:border-rose-500/20"
                        title="Sign Out"
                    >
                        <span className="transition-transform duration-300 group-hover:-translate-x-1 group-hover:scale-110 text-rose-500">
                            <LogOut />
                        </span>
                        {(!sidebarCollapsed || mobileMenuOpen) && <span>Secure Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`
                flex-1 flex flex-col transition-all duration-300 min-h-screen relative
                ${sidebarCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[280px]'}
            `}>
                {/* Global Decorative Background */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

                {/* Glassmorphic Header */}
                <header className="h-20 glass-panel px-6 lg:px-10 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                        >
                            <Menu />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                {NAV_ITEMS.find(i => i.path === pathname)?.icon}
                                {NAV_ITEMS.find(i => i.path === pathname)?.label || 'Overview'}
                            </h2>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                {currentDate} <span className="mx-2">•</span> System Status: <span className="text-emerald-500 shadow-emerald-500/20 drop-shadow-sm">Online</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6">
                        {/* Search Bar - Sleek SaaS style */}
                        <div className="hidden md:flex items-center bg-slate-100/50 px-4 py-2.5 rounded-2xl w-72 focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:bg-white border border-slate-200/50 transition-all group shadow-inner">
                            <Search />
                            <input
                                type="text"
                                placeholder="Search orders, drivers, ID..."
                                className="bg-transparent border-none outline-none text-sm ml-3 w-full text-slate-700 placeholder:text-slate-400 font-medium"
                            />
                            <div className="flex items-center gap-1.5 opacity-50 border border-slate-300 rounded px-1.5 py-0.5 bg-white shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500">⌘</span>
                                <span className="text-[10px] font-bold text-slate-500">K</span>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2.5 text-slate-400 hover:bg-white hover:text-cyan-600 rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-500/10 border border-transparent hover:border-cyan-100 group"
                            >
                                <Bell />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full border border-white shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse flex items-center justify-center text-[10px] text-white font-bold px-1">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden py-2 z-50 transform origin-top-right animate-in fade-in scale-95 duration-200">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 tracking-tight">System Alerts</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[10px] font-bold text-cyan-600 uppercase hover:text-cyan-700 hover:underline tracking-wider"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 font-medium text-sm flex flex-col items-center">
                                                <ShieldCheck />
                                                <span className="mt-2">No alerts right now.</span>
                                            </div>
                                        ) : (
                                            notifications.map((notif: any) => (
                                                <div
                                                    key={notif._id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`px-4 py-3 cursor-pointer border-b border-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!notif.isRead ? 'bg-cyan-50/30' : ''}`}
                                                >
                                                    <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notif.isRead ? 'bg-cyan-500 animate-pulse' : 'bg-transparent'}`}></div>
                                                    <div>
                                                        <h4 className={`text-sm tracking-tight ${!notif.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{notif.message}</p>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2 block">
                                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 text-center">
                                        <button className="text-[11px] font-bold text-slate-500 hover:text-slate-800 tracking-wide uppercase">View All Logs</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-px bg-slate-200 hidden sm:block mx-2" />

                        {/* Admin Profile Details */}
                        <div className="flex items-center gap-3 group cursor-pointer p-1.5 pr-4 rounded-full border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-105 group-hover:bg-cyan-600">
                                SA
                            </div>
                            <div className="hidden lg:flex flex-col items-start">
                                <span className="text-sm font-bold text-slate-800 leading-tight">Super Admin</span>
                                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">Access Level: Max</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 lg:p-10 max-w-[1800px] w-full mx-auto relative z-10 flex-1 flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
}
