"use client";

import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

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

      <div className="bg-white border border-gray-100 p-12 text-center">
        <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No users yet.</p>
        <p className="text-xs text-gray-300 mt-1">Invite team members to manage the platform.</p>
      </div>
    </div>
  );
}
