"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, FileText, Plus, Search, ArrowUpRight, ArrowDownRight, Calendar, Receipt, Banknote, X, Check, AlertCircle, Send, Trash2, Edit2 } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  bookingRef?: string;
  amount: number;
  type: "credit" | "debit";
  method: string;
  status: "completed" | "pending" | "failed";
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  items?: string[];
}

interface Payout {
  id: string;
  supplier: string;
  amount: number;
  date: string;
  status: "scheduled" | "completed" | "failed";
  reference?: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  receipt?: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "2026-05-14", description: "Deposit - TRP-0001 - Sarah Mitchell", bookingRef: "TRP-0001", amount: 3750, type: "credit", method: "Stripe", status: "completed" },
  { id: "2", date: "2026-05-13", description: "Balance Payment - TRP-0004 - Michael Barnes", bookingRef: "TRP-0004", amount: 9200, type: "credit", method: "Bank Transfer", status: "completed" },
  { id: "3", date: "2026-05-12", description: "Deposit - TRP-0003 - Alexander Petrov", bookingRef: "TRP-0003", amount: 2250, type: "credit", method: "PayPal", status: "completed" },
  { id: "4", date: "2026-05-10", description: "Refund - TRP-0008 - William van der Merwe", bookingRef: "TRP-0008", amount: 7200, type: "debit", method: "Stripe", status: "completed" },
  { id: "5", date: "2026-05-08", description: "Deposit - TRP-0002 - Emma Chen", bookingRef: "TRP-0002", amount: 2040, type: "credit", method: "Stripe", status: "completed" },
];

const INITIAL_INVOICES: Invoice[] = [
  { id: "1", number: "INV-2026-0001", client: "Sarah & James Mitchell", amount: 12500, status: "sent", dueDate: "2026-06-01" },
  { id: "2", number: "INV-2026-0002", client: "Emma & Thomas Chen", amount: 6800, status: "partial", dueDate: "2026-06-15" },
  { id: "3", number: "INV-2026-0003", client: "Alexander & Natalia Petrov", amount: 7500, status: "draft", dueDate: "2026-06-20" },
  { id: "4", number: "INV-2026-0004", client: "Michael & Olivia Barnes", amount: 9200, status: "paid", dueDate: "2026-05-15" },
];

const INITIAL_PAYOUTS: Payout[] = [
  { id: "1", supplier: "Kaya Mawa", amount: 5400, date: "2026-05-15", status: "scheduled" },
  { id: "2", supplier: "Puku Ridge Camp", amount: 4200, date: "2026-05-10", status: "completed", reference: "TRF-001" },
  { id: "3", supplier: "ProFlight Zambia", amount: 2800, date: "2026-05-05", status: "completed", reference: "TRF-002" },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: "1", category: "Marketing", description: "Google Ads - May 2026", amount: 2500, date: "2026-05-01", status: "approved" },
  { id: "2", category: "Operations", description: "Office supplies", amount: 450, date: "2026-05-05", status: "approved" },
  { id: "3", category: "Marketing", description: "Social media campaign", amount: 1200, date: "2026-05-10", status: "pending" },
  { id: "4", category: "Staff", description: "Team training", amount: 800, date: "2026-05-12", status: "approved" },
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
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [payouts, setPayouts] = useState<Payout[]>(INITIAL_PAYOUTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<Tab>("transactions");
  const [editItem, setEditItem] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<any>({});

  const showToast = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "invoices", label: "Invoices" },
    { id: "payouts", label: "Payouts" },
    { id: "expenses", label: "Expenses" },
  ];

  const getStats = () => {
    const totalRevenue = transactions.filter(t => t.type === "credit" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === "debit" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
    return [
      { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "text-emerald-600" },
      { label: "Total Expenses", value: `$${totalExpenses.toLocaleString()}`, color: "text-red-600" },
      { label: "Net Profit", value: `$${(totalRevenue - totalExpenses).toLocaleString()}`, color: "text-indigo-600" },
      { label: "Pending Invoices", value: invoices.filter(i => i.status === "sent" || i.status === "partial").length.toString(), color: "text-amber-600" },
    ];
  };

  const openAddModal = (type: Tab) => {
    setModalType(type);
    setEditItem(null);
    if (type === "invoices") setFormData({ number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`, client: "", amount: "", status: "draft", dueDate: "" });
    else if (type === "payouts") setFormData({ supplier: "", amount: "", date: "", status: "scheduled", reference: "" });
    else if (type === "expenses") setFormData({ category: "Marketing", description: "", amount: "", date: "", status: "pending", receipt: "" });
    else setFormData({ description: "", amount: "", type: "credit", method: "Stripe", status: "completed", date: "" });
    setShowModal(true);
  };

  const handleSave = () => {
    if (modalType === "invoices") {
      const newInvoice: Invoice = { id: `inv-${Date.now()}`, ...formData, amount: parseFloat(formData.amount) || 0 };
      if (editItem) setInvoices(invoices.map(i => i.id === editItem.id ? { ...i, ...formData, amount: parseFloat(formData.amount) || 0 } : i));
      else setInvoices([...invoices, newInvoice]);
    } else if (modalType === "payouts") {
      const newPayout: Payout = { id: `pout-${Date.now()}`, ...formData, amount: parseFloat(formData.amount) || 0 };
      if (editItem) setPayouts(payouts.map(p => p.id === editItem.id ? { ...p, ...formData, amount: parseFloat(formData.amount) || 0 } : p));
      else setPayouts([...payouts, newPayout]);
    } else if (modalType === "expenses") {
      const newExpense: Expense = { id: `exp-${Date.now()}`, ...formData, amount: parseFloat(formData.amount) || 0 };
      if (editItem) setExpenses(expenses.map(e => e.id === editItem.id ? { ...e, ...formData, amount: parseFloat(formData.amount) || 0 } : e));
      else setExpenses([...expenses, newExpense]);
    } else {
      const newTrans: Transaction = { id: `trans-${Date.now()}`, ...formData, amount: parseFloat(formData.amount) || 0, date: new Date().toISOString().split("T")[0] };
      if (editItem) setTransactions(transactions.map(t => t.id === editItem.id ? { ...t, ...formData, amount: parseFloat(formData.amount) || 0 } : t));
      else setTransactions([...transactions, newTrans]);
    }
    setShowModal(false);
    showToast(modalType === "invoices" ? "Invoice saved" : modalType === "payouts" ? "Payout saved" : modalType === "expenses" ? "Expense saved" : "Transaction saved", "success");
  };

  const handleDelete = (type: Tab, id: string) => {
    if (type === "invoices") setInvoices(invoices.filter(i => i.id !== id));
    else if (type === "payouts") setPayouts(payouts.filter(p => p.id !== id));
    else if (type === "expenses") setExpenses(expenses.filter(e => e.id !== id));
    else setTransactions(transactions.filter(t => t.id !== id));
    showToast("Deleted successfully", "success");
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Finance</h1><p className="text-earth mt-1">Manage transactions, invoices, payouts, and expenses</p></div>
        <button onClick={() => openAddModal(activeTab)} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add {activeTab === "invoices" ? "Invoice" : activeTab === "payouts" ? "Payout" : activeTab === "expenses" ? "Expense" : "Transaction"}</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">{getStats().map(stat => (<div key={stat.label} className="bg-white p-4 border border-sand-light"><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-xs text-earth">{stat.label}</p></div>))}</div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-sand-light pb-2">
        {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium rounded ${activeTab === tab.id ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"}`}>{tab.label}</button>))}
      </div>

      {/* Content */}
      <div className="bg-white border border-sand-light overflow-hidden">
        {activeTab === "transactions" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Method</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{transactions.map(t => (<tr key={t.id} className="hover:bg-warm-white"><td className="px-4 py-3 text-earth">{t.date}</td><td className="px-4 py-3 text-soft-black">{t.description}</td><td className="px-4 py-3 text-earth">{t.method}</td><td className={`px-4 py-3 font-medium ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "credit" ? "+" : "-"}${t.amount.toLocaleString()}</td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(t); setFormData(t); setModalType("transactions"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("transactions", t.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
        {activeTab === "invoices" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Invoice #</th><th className="text-left px-4 py-3 font-medium text-earth">Client</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Due Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{invoices.map(inv => (<tr key={inv.id} className="hover:bg-warm-white"><td className="px-4 py-3 font-medium text-soft-black">{inv.number}</td><td className="px-4 py-3 text-earth">{inv.client}</td><td className="px-4 py-3 font-medium text-soft-black">${inv.amount.toLocaleString()}</td><td className="px-4 py-3 text-earth">{inv.dueDate}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${invoiceStatusConfig[inv.status].bg} ${invoiceStatusConfig[inv.status].color}`}>{invoiceStatusConfig[inv.status].label}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(inv); setFormData(inv); setModalType("invoices"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("invoices", inv.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
        {activeTab === "payouts" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Supplier</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Reference</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{payouts.map(p => (<tr key={p.id} className="hover:bg-warm-white"><td className="px-4 py-3 font-medium text-soft-black">{p.supplier}</td><td className="px-4 py-3 text-soft-black">${p.amount.toLocaleString()}</td><td className="px-4 py-3 text-earth">{p.date}</td><td className="px-4 py-3 text-earth">{p.reference || "-"}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${p.status === "completed" ? "bg-emerald-50 text-emerald-700" : p.status === "scheduled" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>{p.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(p); setFormData(p); setModalType("payouts"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("payouts", p.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
        {activeTab === "expenses" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Category</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{expenses.map(e => (<tr key={e.id} className="hover:bg-warm-white"><td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded">{e.category}</span></td><td className="px-4 py-3 text-soft-black">{e.description}</td><td className="px-4 py-3 font-medium text-soft-black">${e.amount.toLocaleString()}</td><td className="px-4 py-3 text-earth">{e.date}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${e.status === "approved" ? "bg-emerald-50 text-emerald-700" : e.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{e.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(e); setFormData(e); setModalType("expenses"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("expenses", e.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-soft-black">Add {modalType === "invoices" ? "Invoice" : modalType === "payouts" ? "Payout" : modalType === "expenses" ? "Expense" : "Transaction"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="space-y-4">
                {modalType === "invoices" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Invoice Number</label><input type="text" value={formData.number || ""} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Client Name</label><input type="text" value={formData.client || ""} onChange={e => setFormData({ ...formData, client: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Due Date</label><input type="date" value={formData.dueDate || ""} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status || "draft"} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Partial</option><option value="paid">Paid</option></select></div></>)}
                {modalType === "payouts" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Supplier</label><input type="text" value={formData.supplier || ""} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Date</label><input type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Reference</label><input type="text" value={formData.reference || ""} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div></>)}
                {modalType === "expenses" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Category</label><select value={formData.category || "Marketing"} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option>Marketing</option><option>Operations</option><option>Staff</option><option>Travel</option><option>Technology</option></select></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Description</label><input type="text" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Date</label><input type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status || "pending"} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></>)}
                {modalType === "transactions" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Description</label><input type="text" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-earth uppercase mb-2">Type</label><select value={formData.type || "credit"} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="credit">Credit</option><option value="debit">Debit</option></select></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Method</label><select value={formData.method || "Stripe"} onChange={e => setFormData({ ...formData, method: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option>Stripe</option><option>Bank Transfer</option><option>PayPal</option><option>Credit Card</option></select></div></div></>)}
              </div>
              <div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={handleSave} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium">Save</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}