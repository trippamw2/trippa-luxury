"use client";

import { MessageCircle } from "lucide-react";

export default function AdminInquiries() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer leads and booking requests.</p>
      </div>

      <div className="bg-white border border-gray-100 p-12 text-center">
        <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No inquiries yet.</p>
        <p className="text-xs text-gray-300 mt-1">Inquiries from your contact forms will appear here.</p>
      </div>
    </div>
  );
}
