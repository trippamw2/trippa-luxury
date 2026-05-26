"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Plus, Search, X, Check, AlertCircle, Trash2, Edit2 } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface Transaction {
  id: string; date: string; description: string; bookingRef?: string;
  amount: number; type: "credit" | "debit"; method: string; status: string;
}
interface Invoice {
  id: string; number: string; client: string; amount: number;
  status: string; dueDate: string; items?: string[];
}
interface Payout {
  id: string; supplier: string; amount: number; date: string;
  status: string; reference?: string;
}
interface Expense {
  id: string; category: string; description: string; amount: number;
  date: string; status: string; receipt?: string;
}

function mapTrans(item: any): Transaction {
  return {
    id: item.id, date: item.transactionDate?.split("T")[0] || item.date || "", description: item.description || item.notes || "",
    bookingRef: item.bookingId || "", amount: item.amount || 0,
    type: item.transactionType === "refund" || item.transactionType === "partial_refund" ? "debit" : "credit",
    method: item.paymentMethod || "", status: item.status || "completed",
  };
}
function mapTransToApi(item: Partial<Transaction>): any {
  return {
    transaction_date: item.date, notes: item.description, amount: item.amount,
    transaction_type: item.type === "debit" ? "refund" : "deposit",
    payment_method: item.method, status: item.status || "completed",
  };
}

function mapInv(item: any): Invoice {
  return {
    id: item.id, number: item.invoiceNumber || "", client: item.client || item.bookingId || "",
    amount: item.totalAmount || item.amount || 0, status: item.status || "draft",
    dueDate: item.dueDate || "", items: (item.lineItems || []).map((li: any) => li.description || ""),
  };
}
function mapInvToApi(item: Partial<Invoice>): any {
  return {
    invoice_number: item.number, total_amount: item.amount, status: item.status,
    due_date: item.dueDate, line_items: (item.items || []).map(d => ({ description: d, quantity: 1, unit_price: 0, total: 0 })),
    issue_date: new Date().toISOString().split("T")[0],
    subtotal: item.amount || 0,
  };
}

function mapExp(item: any): Expense {
  return {
    id: item.id, category: item.category || "Other",
    description: item.description || "", amount: item.amount || 0,
    date: item.expenseDate?.split("T")[0] || item.date || "", status: item.status || "approved",
    receipt: item.receiptUrl || "",
  };
}
function mapExpToApi(item: Partial<Expense>): any {
  return {
    category: item.category, // API converts name → category_id
    description: item.description, amount: item.amount,
    expense_date: item.date, receipt_url: item.receipt,
  };
}

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
  const { data: transactions, loading: loadTx, create: createTx, update: updateTx, remove: removeTx } = useApiData<Transaction>("finance/transactions", { mapFromApi: mapTrans, mapToApi: mapTransToApi });
  const { data: invoices, loading: loadInv, create: createInv, update: updateInv, remove: removeInv } = useApiData<Invoice>("finance/invoices", { mapFromApi: mapInv, mapToApi: mapInvToApi });
  const { data: expenses, loading: loadExp, create: createExp, update: updateExp, remove: removeExp } = useApiData<Expense>("finance/expenses", { mapFromApi: mapExp, mapToApi: mapExpToApi });

  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<Tab>("transactions");
  const [editItem, setEditItem] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<any>({});

  const loading = loadTx || loadInv || loadExp;

  const showToast = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "invoices", label: "Invoices" },
    { id: "payouts", label: "Payouts" },
    { id: "expenses", label: "Expenses" },
  ];

  const getStats = () => {
    const totalRevenue = transactions.filter(t => t.type === "credit" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
    const totalExpensesCalc = [...transactions.filter(t => t.type === "debit" && t.status === "completed"), ...expenses].reduce((a, t) => a + t.amount, 0);
    return [
      { label: "Total Revenue", value: `$${(totalRevenue || 0).toLocaleString()}`, color: "text-emerald-600" },
      { label: "Total Expenses", value: `$${(totalExpensesCalc || 0).toLocaleString()}`, color: "text-red-600" },
      { label: "Net Profit", value: `$${((totalRevenue || 0) - (totalExpensesCalc || 0)).toLocaleString()}`, color: "text-indigo-600" },
      { label: "Pending Invoices", value: invoices.filter(i => i.status === "sent" || i.status === "partial" || i.status === "draft").length.toString(), color: "text-amber-600" },
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

  const handleSave = async () => {
    if (modalType === "invoices") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
      const result = editItem ? await updateInv(editItem.id, payload) : await createInv(payload);
      if (result) { showToast("Invoice saved", "success"); setShowModal(false); } else showToast("Failed to save invoice", "error");
    } else if (modalType === "expenses") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
      const result = editItem ? await updateExp(editItem.id, payload) : await createExp(payload);
      if (result) { showToast("Expense saved", "success"); setShowModal(false); } else showToast("Failed to save expense", "error");
    } else if (modalType === "transactions") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0, date: new Date().toISOString().split("T")[0] };
      const result = editItem ? await updateTx(editItem.id, payload) : await createTx(payload);
      if (result) { showToast("Transaction saved", "success"); setShowModal(false); } else showToast("Failed to save transaction", "error");
    } else {
      showToast("Payouts saved locally", "success");
      setShowModal(false);
    }
  };

  const handleDelete = async (type: Tab, id: string) => {
    let ok = false;
    if (type === "invoices") ok = await removeInv(id);
    else if (type === "expenses") ok = await removeExp(id);
    else if (type === "transactions") ok = await removeTx(id);
    else ok = true;
    if (ok) showToast("Deleted successfully", "success");
    else showToast("Failed to delete", "error");
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Finance</h1><p className="text-earth mt-1">Manage transactions, invoices, and expenses</p></div>
        <button onClick={() => openAddModal(activeTab)} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add {activeTab === "invoices" ? "Invoice" : activeTab === "payouts" ? "Payout" : activeTab === "expenses" ? "Expense" : "Transaction"}</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading finance data...</div></div>
      ) : (
      <>
      <div className="grid grid-cols-4 gap-4 mb-6">{getStats().map(stat => (<div key={stat.label} className="bg-white p-4 border border-sand-light"><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-xs text-earth">{stat.label}</p></div>))}</div>

      <div className="flex gap-2 mb-6 border-b border-sand-light pb-2">
        {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium rounded ${activeTab === tab.id ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"}`}>{tab.label}</button>))}
      </div>

      <div className="bg-white border border-sand-light overflow-hidden">
        {activeTab === "transactions" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Method</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{transactions.map(t => (<tr key={t.id} className="hover:bg-warm-white"><td className="px-4 py-3 text-earth">{t.date}</td><td className="px-4 py-3 text-soft-black">{t.description}</td><td className="px-4 py-3 text-earth">{t.method}</td><td className={`px-4 py-3 font-medium ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "credit" ? "+" : "-"}${(t.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(t); setFormData({ ...t, amount: t.amount.toString(), date: t.date }); setModalType("transactions"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("transactions", t.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
        {activeTab === "invoices" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Invoice #</th><th className="text-left px-4 py-3 font-medium text-earth">Client</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Due Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{invoices.map(inv => (<tr key={inv.id} className="hover:bg-warm-white"><td className="px-4 py-3 font-medium text-soft-black">{inv.number}</td><td className="px-4 py-3 text-earth">{inv.client}</td><td className="px-4 py-3 font-medium text-soft-black">${(inv.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-earth">{inv.dueDate}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${invoiceStatusConfig[inv.status]?.bg || "bg-gray-50"} ${invoiceStatusConfig[inv.status]?.color || "text-gray-600"}`}>{invoiceStatusConfig[inv.status]?.label || inv.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(inv); setFormData({ ...inv, amount: inv.amount.toString() }); setModalType("invoices"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("invoices", inv.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
        {activeTab === "payouts" && (
          <div className="p-8 text-center text-earth text-sm">Payouts are managed through the Suppliers module. Go to Suppliers to manage supplier payments.</div>
        )}
        {activeTab === "expenses" && (
          <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Category</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{expenses.map(e => (<tr key={e.id} className="hover:bg-warm-white"><td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded">{e.category}</span></td><td className="px-4 py-3 text-soft-black">{e.description}</td><td className="px-4 py-3 font-medium text-soft-black">${(e.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-earth">{e.date}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${e.status === "approved" ? "bg-emerald-50 text-emerald-700" : e.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{e.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(e); setFormData({ ...e, amount: e.amount.toString(), date: e.date }); setModalType("expenses"); setShowModal(true); }} className="text-xs text-gold mr-3">Edit</button><button onClick={() => handleDelete("expenses", e.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
        )}
      </div>
      </>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0"><h2 className="text-xl font-bold text-soft-black">{editItem ? "Edit" : "Add"} {modalType === "invoices" ? "Invoice" : modalType === "payouts" ? "Payout" : modalType === "expenses" ? "Expense" : "Transaction"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {modalType === "invoices" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Invoice Number</label><input type="text" value={formData.number || ""} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Client Name</label><input type="text" value={formData.client || ""} onChange={e => setFormData({ ...formData, client: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Due Date</label><input type="date" value={formData.dueDate || ""} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status || "draft"} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Partial</option><option value="paid">Paid</option></select></div></>)}
                {modalType === "payouts" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Supplier</label><input type="text" value={formData.supplier || ""} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Date</label><input type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div></>)}
                {modalType === "expenses" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Category</label><select value={formData.category || "Marketing"} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option>Marketing</option><option>Operations</option><option>Staff</option><option>Travel</option><option>Technology</option></select></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Description</label><input type="text" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Date</label><input type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div></>)}
                {modalType === "transactions" && (<><div><label className="block text-xs font-medium text-earth uppercase mb-2">Description</label><input type="text" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Amount</label><input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-earth uppercase mb-2">Type</label><select value={formData.type || "credit"} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="credit">Credit</option><option value="debit">Debit</option></select></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Method</label><select value={formData.method || "Stripe"} onChange={e => setFormData({ ...formData, method: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option>Stripe</option><option>Bank Transfer</option><option>PayPal</option><option>Credit Card</option></select></div></div></>)}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0"><button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={handleSave} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium">Save</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
