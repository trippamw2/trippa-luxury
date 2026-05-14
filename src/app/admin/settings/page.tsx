"use client";

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure platform settings.</p>
      </div>

      <div className="bg-white border border-gray-100 p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
            <input type="text" defaultValue="Trippa" className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input type="text" defaultValue="+27871234567" className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input type="email" defaultValue="concierge@trippa.luxury" className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
            <select className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>ZAR (R)</option>
            </select>
          </div>
          <button className="px-6 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
