import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Server, 
  Activity, 
  Zap, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const FASTAPI_URL = (import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000').replace(/\/$/, '');

interface UptimePeriodStats {
  ratio: string;
  incidents: number;
  downtime: string;
}

interface UptimeStats {
  overall: string;
  last24h: UptimePeriodStats;
  last7d: UptimePeriodStats;
  last30d: UptimePeriodStats;
}

interface OperationalMetrics {
  averageResponseTime: number;
  currentResponseTime: number;
  lastCheckTime: string;
  lastCheckAgo: string;
  intervalMin: number;
  statusDuration: string;
  mtbf: string;
}

interface ResponseTimePoint {
  time: number; // Unix timestamp
  value: number; // Response time in ms
}

interface Incident {
  date: string; // ISO string
  duration: number; // seconds
  resolutionTime: string;
  status: string; // resolved or ongoing
  reason: string;
}

interface UptimeBarTick {
  date: string; // YYYY-MM-DD
  status: string; // up, down, degraded, paused, or unknown
}

interface MonitorData {
  id: number;
  name: string;
  url: string;
  status: string; // up, down, paused, or unknown
  uptime: UptimeStats;
  metrics: OperationalMetrics;
  responseTimes: ResponseTimePoint[];
  incidents: Incident[];
  uptimeBars: UptimeBarTick[];
}

export default function Status() {
  const [monitors, setMonitors] = useState<MonitorData[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchStatusData = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${FASTAPI_URL}/api/status`);
      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `Server returned ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) errMsg = parsed.detail;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success && data.monitors && data.monitors.length > 0) {
        setMonitors(data.monitors);
        setLastRefreshedAt(new Date());
        
        // Select the first monitor by default if none is selected yet
        setSelectedMonitorId(prev => {
          if (prev !== null && data.monitors.some((m: MonitorData) => m.id === prev)) {
            return prev;
          }
          return data.monitors[0].id;
        });
      } else {
        throw new Error("No monitor configurations found on UptimeRobot.");
      }
    } catch (err: any) {
      console.error("Error fetching status dashboard:", err);
      setError(err.message || "Failed to retrieve status data. Make sure UPTIMEROBOT_API_KEY is configured in fastapi-backend/.env");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount and set polling interval (5 minutes)
  useEffect(() => {
    fetchStatusData();
    const interval = setInterval(() => {
      fetchStatusData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchStatusData]);

  // Selected monitor details
  const activeMonitor = monitors.find(m => m.id === selectedMonitorId) || null;

  // Determine overall status of all monitors
  const getOverallStatus = () => {
    if (monitors.length === 0) return { label: "Unknown", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", icon: Clock };
    
    const anyDown = monitors.some(m => m.status === 'down');
    const anyPaused = monitors.some(m => m.status === 'paused');
    const allUp = monitors.every(m => m.status === 'up');

    if (anyDown) {
      return { 
        label: "Partial Outage", 
        color: "text-red-500 dark:text-red-400", 
        bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/20",
        badge: "bg-red-500",
        icon: XCircle,
        message: "Some systems are experiencing issues. Our team is investigating."
      };
    } else if (anyPaused && !allUp) {
      return { 
        label: "Maintenance Mode", 
        color: "text-yellow-600 dark:text-yellow-400", 
        bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-500/20",
        badge: "bg-yellow-500",
        icon: AlertCircle,
        message: "Some services are temporarily paused for maintenance."
      };
    } else {
      return { 
        label: "All Systems Operational", 
        color: "text-emerald-600 dark:text-emerald-400", 
        bg: "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-500/10",
        badge: "bg-emerald-500",
        icon: CheckCircle,
        message: "All services are functioning normally. No disruptions reported."
      };
    }
  };

  const overall = getOverallStatus();

  // Helper for mapping status codes to styles
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "up":
        return { 
          color: "text-emerald-600 dark:text-emerald-400", 
          bg: "bg-emerald-500",
          text: "Up",
          glow: "shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        };
      case "down":
        return { 
          color: "text-red-600 dark:text-red-400", 
          bg: "bg-red-500", 
          text: "Down",
          glow: "shadow-[0_0_10px_rgba(239,68,68,0.3)]"
        };
      case "paused":
        return { 
          color: "text-slate-500 dark:text-slate-400", 
          bg: "bg-slate-500", 
          text: "Paused",
          glow: "shadow-none"
        };
      default:
        return { 
          color: "text-slate-400 dark:text-slate-500", 
          bg: "bg-slate-400", 
          text: "Unknown",
          glow: "shadow-none"
        };
    }
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case "up":
        return "bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]";
      case "down":
        return "bg-red-500 hover:bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
      case "degraded":
        return "bg-amber-500 hover:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]";
      case "paused":
        return "bg-zinc-400 dark:bg-zinc-500 hover:bg-zinc-350 dark:hover:bg-zinc-400";
      default:
        return "bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600";
    }
  };

  // Format timestamp for chart X-axis
  const formatChartDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatIncidentDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Mapping check data for chart
  const chartData = activeMonitor?.responseTimes.map(pt => ({
    time: formatChartDate(pt.time),
    ms: pt.value,
    timestamp: pt.time
  })) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d111a] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200">
      <Helmet>
        <title>Status Dashboard - Vector Mind AI</title>
        <meta name="description" content="Check real-time system status, latency, history, and uptime percentages of Vector Mind AI services." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Navbar1 />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-30">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Status Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Live status monitoring. Automatically refreshes every 5 minutes.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Monitor Selector Dropdown (visible if multiple monitors exist) */}
            {monitors.length > 1 && (
              <div className="relative">
                <select
                  value={selectedMonitorId || ""}
                  onChange={(e) => setSelectedMonitorId(Number(e.target.value))}
                  className="appearance-none bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#262b3a] rounded-xl px-4 py-2.5 pr-10 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm dark:shadow-lg transition-all"
                >
                  {monitors.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchStatusData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 bg-white dark:bg-[#161b26] hover:bg-slate-50 dark:hover:bg-[#1f2636] disabled:opacity-50 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#262b3a] text-xs font-semibold transition-all shadow-sm dark:shadow-lg active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? "animate-spin text-blue-500" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Loading Skeleton Fallback */}
        {loading ? (
          <div className="space-y-6">
            <div className="h-20 bg-white dark:bg-[#161b26]/50 rounded-2xl border border-slate-200 dark:border-[#222736] animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white dark:bg-[#161b26]/50 rounded-2xl border border-slate-200 dark:border-[#222736] animate-pulse" />
              ))}
            </div>
            <div className="h-40 bg-white dark:bg-[#161b26]/50 rounded-2xl border border-slate-200 dark:border-[#222736] animate-pulse" />
            <div className="h-80 bg-white dark:bg-[#161b26]/50 rounded-2xl border border-slate-200 dark:border-[#222736] animate-pulse" />
          </div>
        ) : error ? (
          /* Error State Panel */
          <div className="bg-white dark:bg-[#161b26] rounded-2xl border border-red-500/10 p-8 text-center max-w-xl mx-auto my-12 shadow-md dark:shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Failed to Fetch System Status</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => fetchStatusData(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95"
            >
              Try Again
            </button>
          </div>
        ) : (
          /* Main Dashboard Content */
          <div className="space-y-6">
            
            {/* Top Status Alert Bar */}
            <div className={`rounded-2xl border px-6 py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm dark:shadow-lg bg-white dark:bg-[#161b26] ${
              activeMonitor?.status === 'up' 
                ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.02]' 
                : activeMonitor?.status === 'down'
                ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.02]'
                : 'border-slate-200 dark:border-[#262b3a]'
            }`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <overall.icon className={`w-8 h-8 ${overall.color}`} />
                  <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d111a] animate-ping ${overall.badge}`} />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-800 dark:text-white">{overall.label}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{overall.message}</p>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Last check: {activeMonitor ? activeMonitor.metrics.lastCheckAgo : ""}
                <br />
                Last updated: {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            {activeMonitor && (
              <>
                {/* Top Row - 3 Cards (UptimeRobot Dashboard Replica) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Card 1: Current Status */}
                  <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] hover:border-slate-300 dark:hover:border-[#2e3448] rounded-xl p-6 shadow-sm dark:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        Current Status
                      </h4>
                      <div className="text-3xl font-black mt-3 flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${getStatusStyle(activeMonitor.status).bg} ${getStatusStyle(activeMonitor.status).glow}`} />
                        <span className={getStatusStyle(activeMonitor.status).color}>
                          {getStatusStyle(activeMonitor.status).text}
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {activeMonitor.metrics.statusDuration}
                    </div>
                  </div>

                  {/* Card 2: Last Check */}
                  <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] hover:border-slate-300 dark:hover:border-[#2e3448] rounded-xl p-6 shadow-sm dark:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        Last Check
                      </h4>
                      <div className="text-3xl font-black mt-3 text-slate-800 dark:text-slate-200">
                        {activeMonitor.metrics.lastCheckAgo}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>Checked every {activeMonitor.metrics.intervalMin}m</span>
                      <a href="#" onClick={e => e.preventDefault()} className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" />
                        Get 60 sec. checks
                      </a>
                    </div>
                  </div>

                  {/* Card 3: Last 24 Hours */}
                  <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] hover:border-slate-300 dark:hover:border-[#2e3448] rounded-xl p-6 shadow-sm dark:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <h4 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        Last 24 Hours
                      </h4>
                      <div className="text-3xl font-black mt-3 text-slate-900 dark:text-white">
                        {activeMonitor.uptime.last24h.ratio}%
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="truncate">{activeMonitor.uptime.last24h.downtime}</span>
                    </div>
                  </div>

                </div>

                {/* Sub Stats Row - 5 Sections Card (7 Days, 30 Days, 365 Days, Custom, MTBF) */}
                <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] rounded-xl shadow-sm dark:shadow-md overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-[#222736]">
                    
                    {/* Last 7 Days */}
                    <div className="p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last 7 Days</span>
                      <div className="mt-3">
                        <span className="text-lg font-black text-amber-600 dark:text-amber-500">{activeMonitor.uptime.last7d.ratio}%</span>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 truncate" title={activeMonitor.uptime.last7d.downtime}>
                          {activeMonitor.uptime.last7d.downtime}
                        </p>
                      </div>
                    </div>

                    {/* Last 30 Days */}
                    <div className="p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last 30 Days</span>
                      <div className="mt-3">
                        <span className="text-lg font-black text-amber-600 dark:text-amber-500">{activeMonitor.uptime.last30d.ratio}%</span>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 truncate" title={activeMonitor.uptime.last30d.downtime}>
                          {activeMonitor.uptime.last30d.downtime}
                        </p>
                      </div>
                    </div>

                    {/* Last 365 Days */}
                    <div className="p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last 365 Days</span>
                      <div className="mt-3">
                        <span className="text-lg font-black text-slate-350 dark:text-slate-655">--.---%</span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1 hover:underline cursor-pointer">
                          Unlock with paid plans
                        </p>
                      </div>
                    </div>

                    {/* Custom Picker */}
                    <div className="p-5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
                        Pick...
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                      <div className="mt-3">
                        <span className="text-lg font-black text-slate-350 dark:text-slate-600">--.---%</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                          — incidents, — down
                        </p>
                      </div>
                    </div>

                    {/* MTBF */}
                    <div className="p-5 flex flex-col justify-between col-span-2 md:col-span-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        MTBF
                        <span className="text-[9px] lowercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-normal flex items-center gap-0.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                          7 days
                          <ChevronDown className="w-2.5 h-2.5" />
                        </span>
                      </span>
                      <div className="mt-3">
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{activeMonitor.metrics.mtbf}</span>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">
                          Mean Time Between Failures
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Response Time History Line Chart (UptimeRobot Dashboard Replica) */}
                <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] rounded-xl shadow-sm dark:shadow-md p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200">
                      Response time for All regions
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </h3>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Setup alerts for slow response times
                      </span>
                      <div className="bg-slate-50 dark:bg-[#0d111a] border border-slate-200 dark:border-[#262b3a] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#161b26]">
                        <span>Last hour</span>
                        <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="h-64 mt-4 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#1f2533" className="hidden dark:block" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#64748b" 
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
                            dx={-5}
                            tickFormatter={(value) => `${value}ms`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const pt = payload[0].payload;
                                return (
                                  <div className="bg-white dark:bg-[#090d16] border border-slate-200 dark:border-[#222736] p-3 rounded-lg shadow-md dark:shadow-2xl">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                      {new Date(pt.timestamp * 1000).toLocaleString()}
                                    </p>
                                    <p className="text-xs font-black text-emerald-650 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                      <Activity className="w-3 h-3" />
                                      {pt.ms} ms
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="ms" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        No latency details available for the last 24 hours.
                      </div>
                    )}
                  </div>
                </div>

                {/* 30-Day Uptime Bar Details */}
                <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] rounded-xl shadow-sm dark:shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Uptime Status <span className="text-xs font-normal text-slate-500">Last 30 Days</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-350">{activeMonitor.uptime.overall}% average</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Bar Grid */}
                    <div className="flex gap-[3px] h-8 w-full">
                      {activeMonitor.uptimeBars.map((bar, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm relative group cursor-pointer transition-all ${getBarColor(bar.status)}`}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] shadow-2xl text-center min-w-[120px] whitespace-nowrap">
                              <span className="font-bold text-slate-400">{bar.date}</span>
                              <div className="mt-0.5 flex items-center justify-center gap-1.5 capitalize font-bold">
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(bar.status === 'degraded' ? 'paused' : bar.status).bg}`} />
                                {bar.status === 'degraded' ? 'Partial Outage' : bar.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold px-0.5">
                      <span>30 days ago</span>
                      <div className="h-[1px] flex-1 border-t border-slate-200 dark:border-slate-800/80 border-dashed mx-4" />
                      <span className="text-slate-500 dark:text-slate-400">{activeMonitor.uptime.last30d.ratio}% uptime</span>
                      <div className="h-[1px] flex-1 border-t border-slate-200 dark:border-slate-800/80 border-dashed mx-4" />
                      <span>Today</span>
                    </div>
                  </div>
                </div>

                {/* Incident Logs History */}
                <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#222736] rounded-xl shadow-sm dark:shadow-md p-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5">
                    Incident History <span className="text-xs font-normal text-slate-500">Last 30 Days</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {activeMonitor.incidents.length > 0 ? (
                      activeMonitor.incidents.map((incident, i) => (
                        <div 
                          key={i} 
                          className="bg-slate-55 dark:bg-[#0f131d]/60 rounded-xl p-4 border border-slate-200 dark:border-[#222736] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${incident.status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                Outage Detected
                              </h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                incident.status === 'resolved' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-50/10 text-red-500 dark:text-red-400 border border-red-500/20'
                              }`}>
                                {incident.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {formatIncidentDate(incident.date)}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic">
                              Reason: {incident.reason}
                            </p>
                          </div>

                          <div className="flex flex-row sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0.5 justify-between">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Downtime Duration</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-350">
                              {incident.resolutionTime}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border border-slate-100 dark:border-[#222736]/60 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">All Systems Operational</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          No service outages or incidents recorded in the last 30 days.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}