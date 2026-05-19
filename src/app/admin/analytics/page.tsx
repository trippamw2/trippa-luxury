"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Eye, Settings, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";

interface AnalyticsData {
  totalProperties: number;
  totalBookings: number;
  totalInquiries: number;
  totalTours: number;
  totalPackages: number;
  totalSuppliers: number;
  pendingInquiries: number;
  activeBookings: number;
  totalRevenue: number;
  upcomingCheckins: number;
  bookingStatusDistribution: Record<string, number>;
}

// GA Tracking ID from environment (would be set in .env.local)
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGAConfig, setShowGAConfig] = useState(false);
  const [gaId, setGaId] = useState(GA_TRACKING_ID);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => console.error("Analytics fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const copyTrackingCode = () => {
    const code = `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId || 'G-XXXXXXXXXX'}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId || 'G-XXXXXXXXXX'}');
</script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveGA = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kivara_ga_id", gaId);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = data
    ? [
        { label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}`, change: "All time", icon: DollarSign, color: "text-emerald-600" },
        { label: "Active Bookings", value: String(data.activeBookings), change: `${data.totalBookings} total`, icon: Calendar, color: "text-blue-600" },
        { label: "Properties", value: String(data.totalProperties), change: "Listed", icon: Eye, color: "text-indigo-600" },
        { label: "Conversion (Inq→Book)", value: data.totalInquiries > 0 ? `${Math.round((data.totalBookings / data.totalInquiries) * 100)}%` : "0%", change: `${data.totalInquiries} inquiries`, icon: TrendingUp, color: "text-amber-600" },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Analytics</h1>
          <p className="text-sm text-earth mt-1">Platform metrics and tracking configuration.</p>
        </div>
        <button
          onClick={() => setShowGAConfig(!showGAConfig)}
          className="flex items-center gap-2 px-4 py-2 border border-sand-light text-sm text-soft-black hover:bg-sand-light/20"
        >
          <Settings className="w-4 h-4" />
          GA Configuration
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-earth">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border border-sand-light/50 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-xs text-earth">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-soft-black">{stat.value}</p>
                <p className="text-xs text-earth mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Booking Status Distribution */}
          {data && Object.keys(data.bookingStatusDistribution).length > 0 && (
            <div className="bg-white border border-sand-light/50 p-5 mb-8">
              <h2 className="text-sm font-semibold text-soft-black mb-4">Booking Status Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(data.bookingStatusDistribution).map(([status, count]) => (
                  <div key={status} className="text-center p-3 bg-warm-white border border-sand-light/30">
                    <p className="text-lg font-bold text-soft-black">{count}</p>
                    <p className="text-xs text-earth capitalize">{status.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {data && [
              { label: "Properties", value: data.totalProperties },
              { label: "Tours", value: data.totalTours },
              { label: "Packages", value: data.totalPackages },
              { label: "Suppliers", value: data.totalSuppliers },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-sand-light/50 p-4 text-center">
                <p className="text-xl font-bold text-soft-black">{item.value}</p>
                <p className="text-xs text-earth mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* GA Configuration Panel */}
          {showGAConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-white border border-sand-light/50 p-5 mb-8"
            >
              <h2 className="text-sm font-semibold text-soft-black mb-4">Google Analytics Configuration</h2>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Measurement ID</label>
                  <input
                    type="text"
                    value={gaId}
                    onChange={(e) => setGaId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveGA} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black text-sm font-medium">
                    {saved ? <><Check className="w-4 h-4" />Saved</> : "Save"}
                  </button>
                  <button onClick={copyTrackingCode} className="flex items-center gap-2 px-4 py-2 border border-sand-light text-sm text-soft-black">
                    {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy Tracking Code</>}
                  </button>
                </div>
                <p className="text-xs text-earth">Add the tracking code to your website layout file.</p>
              </div>
            </motion.div>
          )}

          {/* Web Vitals Placeholder */}
          <div className="bg-white border border-sand-light/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h2 className="text-sm font-semibold text-soft-black">Web Vitals & Traffic</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-earth">
              <AlertCircle className="w-4 h-4" />
              <span>Connect Google Analytics to see real-time traffic and web vitals data here.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
