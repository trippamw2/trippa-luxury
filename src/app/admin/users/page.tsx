"use client";

import { motion } from "framer-motion";
import { Users, Shield, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "agent";
  status: "active" | "invited" | "suspended";
  lastActive: string;
}

const MOCK_USERS: AdminUser[] = [
  { id: "1", name: "Admin User", email: "admin@trippa.luxury", role: "admin", status: "active", lastActive: "Just now" },
  { id: "2", name: "Sarah Content", email: "sarah@trippa.luxury", role: "editor", status: "active", lastActive: "2 hours ago" },
  { id: "3", name: "James Concierge", email: "james@trippa.luxury", role: "agent", status: "active", lastActive: "1 day ago" },
  { id: "4", name: "Emma Marketing", email: "emma@trippa.luxury", role: "editor", status: "invited", lastActive: "Never" },
  { id: "5", name: "David Ops", email: "david@trippa.luxury", role: "agent", status: "suspended", lastActive: "2 weeks ago" },
];

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-indigo-50 text-indigo-700",
  editor: "bg-amber-50 text-amber-700",
  agent: "bg-emerald-50 text-emerald-700",
};

const STATUS_BADGES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  invited: "bg-blue-50 text-blue-700",
  suspended: "bg-red-50 text-red-700",
};

export default function AdminUsers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admins, editors, and agents.</p>
        </div>
        <Button variant="primary" size="sm">Invite User</Button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Users", value: "5", color: "text-gray-900" },
          { label: "Active", value: "3", color: "text-emerald-600" },
          { label: "Admins", value: "1", color: "text-indigo-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-gray-100">
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Last Active</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_USERS.map((user, i) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-500">
                        {user.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500">{user.email}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${ROLE_BADGES[user.role]}`}>
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs">{user.lastActive}</td>
                <td className="px-5 py-4 text-right">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 mr-3">
                    <Edit3 className="w-3.5 h-3.5 inline" /> Edit
                  </button>
                  <button className="text-xs text-red-600 hover:text-red-800">
                    <Trash2 className="w-3.5 h-3.5 inline" /> Remove
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
