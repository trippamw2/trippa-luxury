"use client";

import { BarChart3 } from "lucide-react";

export default function AdminAnalytics() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track traffic, bookings, and conversions.</p>
      </div>

      <div className="bg-white border border-gray-100 p-12 text-center">
        <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Analytics data will appear here once your site is live.</p>
        <p className="text-xs text-gray-300 mt-1">Connect Google Analytics or your preferred analytics tool.</p>
      </div>
    </div>
  );
}
