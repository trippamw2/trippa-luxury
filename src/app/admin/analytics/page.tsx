"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Eye, Settings, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";

const STATS = [
  { label: "Total Revenue (MTD)", value: "$84,500", change: "+12%", positive: true, icon: DollarSign, color: "text-emerald-600" },
  { label: "Active Bookings", value: "12", change: "+3", positive: true, icon: Calendar, color: "text-blue-600" },
  { label: "Website Visitors (MTD)", value: "3,842", change: "+28%", positive: true, icon: Eye, color: "text-indigo-600" },
  { label: "Conversion Rate", value: "4.2%", change: "+0.8%", positive: true, icon: TrendingUp, color: "text-amber-600" },
];

const RECENT_ACTIVITY = [
  { action: "New booking confirmed", detail: "TRP-0009 — Beach & Bush Escape", time: "10 min ago" },
  { action: "Inquiry received", detail: "Sarah & James Mitchell — Lake Malawi", time: "2 hours ago" },
  { action: "Payment processed", detail: "TRP-0002 — $6,800 deposit received", time: "4 hours ago" },
  { action: "Tour created", detail: "Walking Safari Adventure — South Luangwa", time: "1 day ago" },
  { action: "Property updated", detail: "Kaya Mawa — pricing and availability", time: "2 days ago" },
];

// GA Tracking ID from environment (would be set in .env.local)
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export default function AdminAnalytics() {
  const [showGAConfig, setShowGAConfig] = useState(false);
  const [gaId, setGaId] = useState(GA_TRACKING_ID);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const saveGAConfig = () => {
    // In production, this would save to database/env
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Analytics</h1>
          <p className="text-sm text-earth mt-1">Track traffic, bookings, and conversions.</p>
        </div>
        <button 
          onClick={() => setShowGAConfig(!showGAConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream rounded hover:bg-soft-black-light transition-colors"
        >
          <Settings className="w-4 h-4" />
          GA Configuration
        </button>
      </div>

      {/* Google Analytics Configuration Panel */}
      {showGAConfig && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-sand-light rounded-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-soft-black">Google Analytics Configuration</h2>
            <a 
              href="https://analytics.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gold hover:underline"
            >
              Open GA Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* GA ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-soft-black mb-2">Google Analytics Measurement ID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={gaId}
                onChange={(e) => setGaId(e.target.value)}
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                className="flex-1 px-4 py-2 border border-sand-light rounded focus:border-gold focus:outline-none"
              />
              <button 
                onClick={saveGAConfig}
                className="px-4 py-2 bg-gold text-soft-black rounded hover:bg-gold/90 transition-colors"
              >
                {saved ? <Check className="w-4 h-4" /> : "Save"}
              </button>
            </div>
            <p className="text-xs text-earth mt-1">
              Enter your GA4 Measurement ID (format: G-XXXXXXXXXX) or UA code (UA-XXXXXXXX-X)
            </p>
          </div>

          {/* Tracking Code */}
          <div className="bg-cream border border-sand-light rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-soft-black">Tracking Code</span>
              <button 
                onClick={copyTrackingCode}
                className="flex items-center gap-1 text-xs text-gold hover:underline"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
            <pre className="text-xs text-earth overflow-x-auto">
{`<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId || 'G-XXXXXXXXXX'}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId || 'G-XXXXXXXXXX'}');
</script>`}
            </pre>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to set up:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Go to <a href="https://analytics.google.com" target="_blank" className="underline">Google Analytics</a></li>
                  <li>Create a GA4 property or use existing one</li>
                  <li>Copy your Measurement ID (starts with G-)</li>
                  <li>Paste it above and save</li>
                  <li>Add the tracking code to your site's head section</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gaId ? 'bg-emerald-500' : 'bg-earth'}`} />
            <span className="text-sm text-earth">
              {gaId ? `Connected: ${gaId}` : "Not configured - add your GA ID above"}
            </span>
          </div>
        </motion.div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-sand-light p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-earth uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-soft-black mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className={`mt-3 text-sm ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {stat.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Traffic Overview */}
        <div className="bg-white border border-sand-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-soft-black">Traffic Overview</h3>
            <span className="text-xs text-earth">Last 30 days</span>
          </div>
          <div className="space-y-3">
            {[
              { source: "Organic Search", visits: "1,842", percent: 48 },
              { source: "Direct", visits: "956", percent: 25 },
              { source: "Social Media", visits: "612", percent: 16 },
              { source: "Referral", visits: "432", percent: 11 },
            ].map((item) => (
              <div key={item.source}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-soft-black">{item.source}</span>
                  <span className="text-earth">{item.visits} visits</span>
                </div>
                <div className="h-2 bg-cream rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gold rounded-full" 
                    style={{ width: `${item.percent}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white border border-sand-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-soft-black">Top Pages</h3>
            <span className="text-xs text-earth">Last 30 days</span>
          </div>
          <div className="space-y-3">
            {[
              { page: "/lake-malawi", views: "1,245", time: "2:34" },
              { page: "/zanzibar", views: "987", time: "2:12" },
              { page: "/packages", views: "756", time: "1:45" },
              { page: "/south-luangwa", views: "634", time: "2:56" },
              { page: "/", views: "542", time: "1:23" },
            ].map((item) => (
              <div key={item.page} className="flex items-center justify-between text-sm">
                <span className="text-soft-black">{item.page}</span>
                <div className="flex items-center gap-4">
                  <span className="text-earth">{item.views} views</span>
                  <span className="text-earth-light">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-sand-light p-6">
        <h3 className="font-bold text-soft-black mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {RECENT_ACTIVITY.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 pb-4 border-b border-sand-light last:border-0"
            >
              <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-soft-black font-medium">{item.action}</p>
                <p className="text-xs text-earth">{item.detail}</p>
              </div>
              <span className="text-xs text-earth-light">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}