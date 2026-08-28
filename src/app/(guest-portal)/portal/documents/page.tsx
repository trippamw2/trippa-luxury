"use client";

import { FileText, Download } from "lucide-react";

const DOCUMENTS = [
  {
    type: "visa-info",
    title: "Visa Requirements",
    description: "Essential visa information for popular Kivara destinations including Zambia, Zimbabwe, Botswana, Tanzania, Kenya, and South Africa.",
  },
  {
    type: "packing-list",
    title: "Packing Checklist",
    description: "Comprehensive packing guide tailored for African safari and beach destinations by season.",
  },
  {
    type: "travel-insurance",
    title: "Travel Insurance Guide",
    description: "Everything you need to know about travel insurance for your luxury African journey.",
  },
];

export default function PortalDocumentsPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl text-[#1A1A1A] mb-2">
        Travel Documents
      </h1>
      <p className="text-sm text-[#8B7D6B] mb-8">Essential information for your journey.</p>

      <div className="space-y-4">
        {DOCUMENTS.map((doc) => (
          <div
            key={doc.type}
            className="bg-white border border-[#EDE5DA] p-6 flex items-start justify-between hover:border-[#C9A96E] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#F5F0EB] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#C9A96E]" />
              </div>
              <div>
                <h3 className="font-heading text-base text-[#1A1A1A]">
                  {doc.title}
                </h3>
                <p className="text-xs text-[#8B7D6B] mt-1">{doc.description}</p>
              </div>
            </div>
            <a
              href={`/api/documents/travel/${doc.type}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-[#FAF7F2] text-[10px] uppercase tracking-[1px] hover:bg-[#2A2A2A] transition-colors flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
