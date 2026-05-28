"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

// Premium Icons for Stat Cards
const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-5h-7v7Z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
);
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
);
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
);
const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
);

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    pendingKYC: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

        const [ordersRes, driversRes] = await Promise.all([
          fetch(`${apiUrl}/orders`),
          fetch(`${apiUrl}/drivers`),
        ]);

        if (!ordersRes.ok || !driversRes.ok) throw new Error("Failed to fetch data via APIs. System offline.");

        const ordersData = await ordersRes.json();
        const orders = ordersData.orders || [];
        const drivers = await driversRes.json();

        const activeOrders = orders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length;
        const completedOrders = orders.filter((o: any) => o.status === "delivered").length;
        const cancelledOrders = orders.filter((o: any) => o.status === "cancelled").length;
        const activeDrivers = drivers.filter((d: any) => d.is_active).length;
        const pendingKYC = drivers.filter((d: any) => d.kyc_status === "pending").length;
        const totalRevenue = orders
          .filter((o: any) => o.status === "delivered")
          .reduce((sum: number, o: any) => sum + (Number(o.fare?.total) || 0), 0);

        setStats({
          totalOrders: orders.length,
          activeOrders,
          completedOrders,
          cancelledOrders,
          totalDrivers: drivers.length,
          activeDrivers,
          pendingKYC,
          totalRevenue,
        });

        setRecentOrders(orders.slice(-8).reverse());
        setTopDrivers(drivers.filter((d: any) => d.name).slice(0, 5));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchDashboardData();

    // Setup realtime Sync
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000");
    
    socket.on('fleet_updated', () => {
        console.log("Realtime: Fleet update detected. Syncing dashboard...");
        fetchDashboardData(true);
    });

    return () => {
        socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm animate-pulse">Synchronizing Core Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
        <ShieldIcon />
        <div>
          <h3 className="font-black text-rose-800 tracking-tight text-lg">System Error</h3>
          <p className="text-rose-600 mt-1 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 font-bold rounded-xl text-sm hover:bg-rose-200 transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const statCards = [
    {
      label: "Total Orders", value: stats.totalOrders, icon: <BoxIcon />,
      gradient: "from-blue-600 to-cyan-500", shadow: "shadow-cyan-500/30",
      trend: "+12.5%", trendColor: "text-emerald-500"
    },
    {
      label: "Active Orders", value: stats.activeOrders, icon: <TruckIcon />,
      gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/30",
      trend: "Live", trendColor: "text-amber-500 animate-pulse"
    },
    {
      label: "Completed", value: stats.completedOrders, icon: <CheckCircleIcon />,
      gradient: "from-emerald-500 to-teal-400", shadow: "shadow-emerald-500/30",
      trend: "+4.2%", trendColor: "text-emerald-500"
    },
    {
      label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: <WalletIcon />,
      gradient: "from-violet-600 to-purple-500", shadow: "shadow-purple-500/30",
      trend: "+18.1%", trendColor: "text-emerald-500"
    },
    {
      label: "Total Fleet", value: stats.totalDrivers, icon: <UsersIcon />,
      gradient: "from-indigo-600 to-blue-500", shadow: "shadow-indigo-500/30",
      trend: "+2 new", trendColor: "text-blue-500"
    },
    {
      label: "Action Required (KYC)", value: stats.pendingKYC, icon: <ShieldIcon />,
      gradient: "from-rose-500 to-red-500", shadow: "shadow-rose-500/30",
      trend: "Pending", trendColor: "text-rose-500"
    },
  ];

  const statusBadge = (status: string) => {
    const specs: any = {
      delivered: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-200" },
      pending: { bg: "bg-amber-500/10", text: "text-amber-600", dot: "bg-amber-500", border: "border-amber-200" },
      cancelled: { bg: "bg-rose-500/10", text: "text-rose-600", dot: "bg-rose-500", border: "border-rose-200" },
      in_transit: { bg: "bg-blue-500/10", text: "text-blue-600", dot: "bg-blue-500 animate-pulse", border: "border-blue-200" },
      picked_up: { bg: "bg-violet-500/10", text: "text-violet-600", dot: "bg-violet-500", border: "border-violet-200" },
    };
    const config = specs[status] || { bg: "bg-slate-500/10", text: "text-slate-600", dot: "bg-slate-500", border: "border-slate-200" };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${config.bg} border ${config.border}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
        <span className={`text-[11px] font-black uppercase tracking-widest ${config.text}`}>
          {status?.replace("_", " ")}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* SaaS Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">
          {getGreeting()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">Admin</span>
        </h1>
        <p className="text-slate-500 font-medium mt-2 text-lg">
          System performance looks optimal. Here is your operations overview.
        </p>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="glass-panel rounded-3xl p-6 group hover:-translate-y-2 transition-transform duration-300 cursor-default relative overflow-hidden"
          >
            {/* Glow effect on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg ${card.shadow} transform group-hover:rotate-6 transition-all duration-300`}>
                {card.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${card.trendColor} px-2 py-1 bg-white/50 rounded-lg backdrop-blur-sm border border-slate-100`}>
                {card.trend}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{card.label}</p>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Operational Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Modern SaaS Data Grid (Recent Orders) */}
        <div className="xl:col-span-8 glass-panel rounded-[32px] overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-100/50 bg-white/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <TruckIcon /> Live Operations
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Real-time tracking of active fleet activities</p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-cyan-600 hover:shadow-cyan-600/30 transition-all group"
            >
              Open Command Center <ExternalLinkIcon />
            </button>
          </div>

          <div className="overflow-x-auto flex-1 bg-white/30 backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Ref</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Terminal / Location</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <BoxIcon />
                      </div>
                      <p className="text-slate-500 font-bold text-lg">No active telemetry found.</p>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order: any) => (
                    <tr key={order._id} className="hover:bg-cyan-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <span className="font-mono text-xs font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm group-hover:border-cyan-200 group-hover:text-cyan-700 transition-colors">
                          {order._id.substring(order._id.length - 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {statusBadge(order.status)}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-700 max-w-[250px] truncate group-hover:text-slate-900">
                          {order.pickup_address || "Hub Coordinate Not Set"}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="text-sm font-black text-slate-800 tracking-tight bg-slate-100 px-3 py-1.5 rounded-xl group-hover:bg-cyan-100 group-hover:text-cyan-800 transition-colors">
                          ₹{order.fare?.total || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column Analytics */}
        <div className="xl:col-span-4 space-y-8">

          {/* Fleet Health Meter */}
          <div className="glass-panel rounded-[32px] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none"></div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-8 flex items-center gap-2">
              <ShieldIcon /> System Health
            </h3>

            <div className="space-y-8">
              {/* Driver Utilization */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Fleet Utilization</span>
                  <span className="text-xl font-black text-indigo-600">{stats.activeDrivers} <span className="text-sm text-slate-400">/ {stats.totalDrivers}</span></span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000"
                    style={{ width: `${stats.totalDrivers ? (stats.activeDrivers / stats.totalDrivers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Delivery Success */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Fulfilment Rate</span>
                  <span className="text-xl font-black text-emerald-500">
                    {stats.totalOrders ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                    style={{ width: `${stats.totalOrders ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-200/50">
              <div className="bg-white/50 border border-slate-200 rounded-2xl p-4 hover:bg-white transition-colors">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.15em] mb-1">Attritional (Cancels)</p>
                <p className="text-3xl font-black text-slate-800">{stats.cancelledOrders}</p>
              </div>
              <div className="bg-white/50 border border-slate-200 rounded-2xl p-4 hover:bg-white transition-colors cursor-pointer group" onClick={() => router.push('/kyc')}>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] mb-1">KYC Backlog</p>
                <p className="text-3xl font-black text-slate-800 group-hover:text-amber-600 transition-colors flex items-center justify-between">
                  {stats.pendingKYC}
                  <ExternalLinkIcon />
                </p>
              </div>
            </div>
          </div>

          {/* Top Drivers (Leaderboard) */}
          <div className="glass-panel rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <UsersIcon /> Top Operators
              </h3>
              <button className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                Full Roster
              </button>
            </div>

            {topDrivers.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm font-bold bg-slate-50 rounded-2xl border border-slate-100">
                Telemetry gathering in progress...
              </div>
            ) : (
              <div className="space-y-4">
                {topDrivers.map((driver, index) => (
                  <div key={driver._id} className="flex items-center gap-4 group cursor-pointer p-3 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="relative">
                      {/* Rank Badge */}
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg z-10 border-2 border-white">
                        #{index + 1}
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 border border-indigo-100/50 rounded-2xl flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform shadow-inner">
                        {driver.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${driver.is_active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pl-1">
                      <p className="text-sm font-black text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">{driver.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {driver.vehicle_type || 'Transport'} <span className="mx-1">•</span> {driver.city || 'Hub'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-100">
                        <span className="text-[10px]">★</span>
                        <span className="text-xs font-black">4.9</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
