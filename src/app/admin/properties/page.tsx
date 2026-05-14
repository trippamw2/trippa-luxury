"use client";

import { Button } from "@/components/ui/button";
import { PROPERTIES } from "@/lib/constants";
import { formatDestination } from "@/lib/utils";

export default function AdminProperties() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your luxury property collection.</p>
        </div>
        <Button variant="primary" size="sm">Add Property</Button>
      </div>

      <div className="bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Destination</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Price</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {PROPERTIES.map((property) => (
              <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{property.name}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{formatDestination(property.destination)}</td>
                <td className="px-4 py-3 text-gray-500">{property.location}</td>
                <td className="px-4 py-3">{property.rating}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{property.priceRange}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 mr-3">Edit</button>
                  <button className="text-xs text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
