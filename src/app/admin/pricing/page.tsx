"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Save, RefreshCw } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface PricingItem {
  id: string;
  propertyId: string;
  propertyName: string;
  currentRate: string;
  baseRate: number;
  peakSurcharge: number;
  lowSeasonDiscount: number;
  smartPrice: number | null;
  currency: string;
}

function mapPricing(item: any): PricingItem {
  return {
    id: item.id,
    propertyId: item.propertyId,
    propertyName: item.propertyName,
    currentRate: item.currentRate || `$${item.baseRate || 500}/night`,
    baseRate: item.baseRate || 500,
    peakSurcharge: item.peakSurcharge ?? 25,
    lowSeasonDiscount: item.lowSeasonDiscount ?? 20,
    smartPrice: item.smartPrice || null,
    currency: item.currency || "USD",
  };
}

function mapPricingToApi(item: Partial<PricingItem>): any {
  return {
    property_id: item.propertyId,
    base_rate: item.baseRate,
    peak_surcharge: item.peakSurcharge,
    low_season_discount: item.lowSeasonDiscount,
    smart_price: item.smartPrice,
    currency: item.currency,
  };
}

export default function PricingPage() {
  const { data: pricing, loading, create, update } = useApiData<PricingItem>("pricing", {
    mapFromApi: mapPricing,
    mapToApi: mapPricingToApi,
  });

  const [localPricing, setLocalPricing] = useState<PricingItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const items = localPricing ?? pricing;

  const handleSmartPricing = () => {
    if (!items) return;
    setLocalPricing(
      items.map((p) => {
        const base = p.baseRate;
        const peakMultiplier = 1 + (p.peakSurcharge || 0) / 100;
        const smart = Math.round(base * peakMultiplier);
        return { ...p, smartPrice: smart };
      })
    );
  };

  const handleSave = async () => {
    if (!localPricing) return;
    setSaving(true);
    try {
      for (const p of localPricing) {
        if (p.id.startsWith("tmp-")) {
          await create(mapPricingToApi(p));
        } else {
          await update(p.id, mapPricingToApi(p));
        }
      }
      setLocalPricing(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (idx: number, field: keyof PricingItem, value: any) => {
    if (!items) return;
    const next = [...items];
    (next[idx] as any)[field] = value;
    if (field === "peakSurcharge" || field === "lowSeasonDiscount") {
      (next[idx] as any).smartPrice = null;
    }
    setLocalPricing(next);
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-soft-black">Pricing Engine</h1>
            <p className="text-sm text-earth mt-1">Manage property rates, seasonality, and smart pricing.</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-earth">Loading pricing data...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Pricing Engine</h1>
          <p className="text-sm text-earth mt-1">Manage property rates, seasonality, and smart pricing.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSmartPricing}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-cream text-sm font-medium hover:bg-gold-dark transition-colors"
          >
            <TrendingUp className="w-4 h-4" /> Smart Pricing
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !localPricing}
            className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : saved ? (
              <><Save className="w-4 h-4" /> Saved</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-4 px-4 font-medium text-earth text-xs uppercase tracking-wider">Property</th>
              <th className="text-left py-4 px-4 font-medium text-earth text-xs uppercase tracking-wider">Current Rate</th>
              <th className="text-left py-4 px-4 font-medium text-earth text-xs uppercase tracking-wider">Peak Surcharge</th>
              <th className="text-left py-4 px-4 font-medium text-earth text-xs uppercase tracking-wider">Low Season Discount</th>
              <th className="text-left py-4 px-4 font-medium text-earth text-xs uppercase tracking-wider">Smart Price</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((p, i) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-earth/40" />
                    <span className="font-medium text-soft-black">{p.propertyName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-earth">{p.currentRate}</td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={p.peakSurcharge}
                    onChange={(e) => updateItem(i, "peakSurcharge", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                    min="0"
                    max="100"
                  />
                  <span className="text-earth ml-1">%</span>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={p.lowSeasonDiscount}
                    onChange={(e) => updateItem(i, "lowSeasonDiscount", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                    min="0"
                    max="100"
                  />
                  <span className="text-earth ml-1">%</span>
                </td>
                <td className="py-3 px-4">
                  {p.smartPrice ? (
                    <span className="text-green-600 font-medium">${p.smartPrice.toLocaleString()}/night</span>
                  ) : (
                    <span className="text-earth/40 italic">Run smart pricing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs text-amber-800">
          <strong>Smart Pricing:</strong> Click the button above to calculate suggested rates based on
          base prices and peak season surcharges. This is a rule-based estimation engine. In production,
          this would integrate with real-time market data and occupancy analytics.
        </p>
      </div>
    </div>
  );
}
