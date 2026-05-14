"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, FileText, Plus, Search, ArrowUpRight, ArrowDownRight, Calendar, Filter, Receipt, Banknote, PieChart } from "lucide-react";

const revenueStats = [
  { label: "Total Revenue (MTD)", value: "$142,800", change: "+12.5%", trend: "up", color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Outstanding Payments", value: "$24,500", change: "-8.3%", trend: "down", color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Average Booking Value", value: "$8,450", change: "+5.2%", trend: "up", color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Net Profit (MTD)", value: "$38,200", change: "+15.1%", trend: "up", color: "text-indigo-600", bg: "bg-indigo-50" },
];

const MOCK_TRANSACTIONS = [
  { id: "1", date: "2026-05-14", description: "Deposit - TRP-0001 - Sarah Mitchell", bookingRef: "TRP-0001", amount: 3750, type: "credit", method: "Stripe", status: "completed" },
  { id: "2", date: "2026-05-13", description: "Balance Payment - TRP-0004 - Michael Barnes", bookingRef: "TRP-0004", amount: 9200, type: "credit", method: "Bank Transfer", status: "completed" },
  { id: "3", date: "2026-05-12", description: "Deposit - TRP-0003 - Alexander Petrov", bookingRef: "TRP-0003", amount: 2250, type: "credit", method: "PayPal", status: "completed" },
  { id: "4", date: "2026-05-10", description: "Refund - TRP-0008 - William van der Merwe", bookingRef: "TRP-0008", amount: 7200, type: "debit", method: "Stripe", status: "completed" },
  { id: "5", date: "2026-05-08", description: "Deposit - TRP-0002 - Emma Chen", bookingRef: "TRP-0002", amount: 2040, type: "credit", method: "Stripe", status: "completed" },
  { id: "6", date: "2026-04-28", description: "Full Payment - TRP-0005 - Anders Solberg", bookingRef: "TRP-0005", amount: 15000, type: "credit", method: "Bank Transfer", status: "completed" },
  { id: "7", date: "2026-04-20", description: "Supplier Payment - Puku Ridge Camp", bookingRef: null, amount: 5400, type: "debit", method: "Bank Transfer", status: "completed" },
  { id: "8", date: "2026-04-15", description: "Marketing Expense - Google Ads", bookingRef: null, amount: 2500, type: "debit", method: "Credit Card", status: "completed" },
];

const MOCK_INVOICES = [
  { id: "1", number: "INV-2026-0001", client: "Sarah & James Mitchell", amount: 12500, status: "sent", dueDate: "2026-06-01" },
  { id: "2", number: "INV-2026-0002", client: "Emma & Thomas Chen", amount: 6800, status: "partial", dueDate: "2026-06-15" },
  { id: "3", number: "INV-2026-0003", client: "Alexander & Natalia Petrov", amount: 7500, status: "draft", dueDate: "2026-06-20" },
  { id: "4", number: "INV-2026-0004", client: "Michael & Olivia Barnes", amount: 9200, status: "paid", dueDate: "2026-05-15" },
  { id: "5", number: "INV-2026-0005", client: "Anders & Ingrid Solberg", amount: 15000, status: "paid", dueDate: "2026-05-01" },
];

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100" },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50" },
  partial: { label: "Partial", color: "text-amber-600", bg: "bg-amber-50" },
  paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50" },
  overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50" },
};

type Tab = "transactions" | "invoices" | "payouts" | "expenses";

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "invoices", label: "Invoices" },
    { id: "payouts", label: "Supplier Payouts" },
    { id: "expenses", label: "Expenses" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, invoicing, payouts, and expense management.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-all">
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {revenueStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 flex items-center justify-center ${stat.bg}`}>
                {stat.trend === "up" ? <TrendingUp className={`w-4 h-4 ${stat.color}`} /> : <TrendingDown className={`w-4 h-4 ${stat.color}`} />}
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
                {stat.change}
                {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.id ? "text-soft-black" : "text-gray-400 hover:text-gray-600"}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-soft-black" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content: Transactions */}
      {activeTab === "transactions" && (
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Method</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_TRANSACTIONS.map((tx, i) => (
                  <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.date}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{tx.description}</span>
                      {tx.bookingRef && <span className="block text-xs text-indigo-500">{tx.bookingRef}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.method}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "-"}${tx.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">{tx.status}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Invoices */}
      {activeTab === "invoices" && (
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_INVOICES.map((inv, i) => {
                  const statusConfig = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
                  return (
                    <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{inv.number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{inv.client}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">${inv.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{inv.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>{statusConfig.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs text-indigo-600 hover:text-indigo-800 mr-3"><FileText className="w-3.5 h-3.5 inline mr-1" />View</button>
                        <button className="text-xs text-gray-600 hover:text-gray-800"><Download className="w-3.5 h-3.5 inline mr-1" />PDF</button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Supplier Payouts */}
      {activeTab === "payouts" && (
        <div className="bg-white border border-gray-100 p-8 text-center">
          <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Supplier Payouts</h3>
          <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">Track and manage payments to your suppliers including lodges, airlines, guides, and activity providers.</p>
          <button className="px-5 py-2.5 bg-soft-black text-cream text-xs tracking-widest uppercase hover:bg-soft-black-light transition-colors">
            Schedule a Payout
          </button>
        </div>
      )}

      {/* Tab Content: Expenses */}
      {activeTab === "expenses" && (
        <div className="bg-white border border-gray-100 p-8 text-center">
          <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Expense Tracking</h3>
          <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">Log and categorize operational expenses. Track P&L with supplier costs, marketing spend, and overheads.</p>
          <button className="px-5 py-2.5 bg-soft-black text-cream text-xs tracking-widest uppercase hover:bg-soft-black-light transition-colors">
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            Add Expense
          </button>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="mt-8 bg-soft-black text-cream p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-wider uppercase">May 2026 Summary</h3>
          <span className="text-xs text-earth-light">Profit Margin: 26.7%</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-earth-light">Gross Revenue</p>
            <p className="text-lg font-semibold text-cream mt-1">$142,800</p>
          </div>
          <div>
            <p className="text-xs text-earth-light">Supplier Costs</p>
            <p className="text-lg font-semibold text-cream mt-1">$87,400</p>
          </div>
          <div>
            <p className="text-xs text-earth-light">Operating Expenses</p>
            <p className="text-lg font-semibold text-cream mt-1">$17,200</p>
          </div>
          <div>
            <p className="text-xs text-earth-light">Net Profit</p>
            <p className="text-lg font-semibold text-gold-light mt-1">$38,200</p>
          </div>
        </div>
      </div>
    </div>
  );
}
