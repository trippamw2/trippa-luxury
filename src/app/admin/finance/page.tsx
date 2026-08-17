"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Banknote } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { FormInput, FormSelect, FormTextarea } from "@/app/admin/components/FormField";

interface Transaction {
  id: string; date: string; description: string; bookingRef?: string;
  amount: number; type: "credit" | "debit"; method: string; status: string;
}
interface Invoice {
  id: string; number: string; client: string; amount: number;
  status: string; dueDate: string; items?: string[];
}
interface Expense {
  id: string; category: string; description: string; amount: number;
  date: string; status: string; receipt?: string;
}
interface Payout {
  id: string;
  supplierId: string;
  supplierName: string;
  bookingId?: string | null;
  bookingReference?: string | null;
  amount: number;
  currency: string;
  status: "scheduled" | "processing" | "paid" | "failed" | "cancelled";
  scheduledDate?: string;
  paidDate?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

/** Raw row shape returned by the payouts admin API (custom camelCase shape). */
interface ApiPayout {
  id?: string;
  supplierId?: string;
  supplierName?: string;
  bookingId?: string | null;
  bookingReference?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  scheduledDate?: string;
  paidDate?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

/** Raw row shape returned by the transactions admin API (camelCase DB columns). */
interface ApiTransaction {
  id?: string | null;
  transactionDate?: string | null;
  description?: string | null;
  notes?: string | null;
  bookingId?: string | null;
  amount?: number | null;
  transactionType?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
}
/** Raw row shape returned by the invoices admin API (camelCase DB columns). */
interface ApiInvoice {
  id?: string | null;
  invoiceNumber?: string | null;
  client?: string | null;
  bookingId?: string | null;
  totalAmount?: number | null;
  amount?: number | null;
  status?: string | null;
  dueDate?: string | null;
  lineItems?: { description?: string }[] | null;
}
/** Raw row shape returned by the expenses admin API (camelCase + joined category). */
interface ApiExpense {
  id?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  description?: string | null;
  amount?: number | null;
  expenseDate?: string | null;
  status?: string | null;
  receiptUrl?: string | null;
}

/** Payload for creating/updating a transaction (snake_case DB column keys). */
interface TransactionApiPayload {
  transaction_date?: string;
  notes?: string;
  amount?: number;
  transaction_type?: string;
  payment_method?: string;
  status?: string;
}
/** Payload for creating/updating an invoice (snake_case DB column keys). */
interface InvoiceApiPayload {
  invoice_number?: string;
  total_amount?: number;
  status?: string;
  due_date?: string;
  line_items?: { description: string; quantity: number; unit_price: number; total: number }[];
  issue_date?: string;
  subtotal?: number;
}
/** Payload for creating/updating an expense (snake_case DB column keys). */
interface ExpenseApiPayload {
  category?: string;
  description?: string;
  amount?: number;
  expense_date?: string;
  receipt_url?: string;
}

function mapTrans(item: ApiTransaction): Transaction {
  return {
    id: item.id || "", date: item.transactionDate?.split("T")[0] || "", description: item.description || item.notes || "",
    bookingRef: item.bookingId || "", amount: item.amount || 0,
    type: item.transactionType === "refund" || item.transactionType === "partial_refund" ? "debit" : "credit",
    method: item.paymentMethod || "", status: item.status || "completed",
  };
}
function mapTransToApi(item: Partial<Transaction>): TransactionApiPayload {
  return {
    transaction_date: item.date, notes: item.description, amount: item.amount,
    transaction_type: item.type === "debit" ? "refund" : "deposit",
    payment_method: item.method, status: item.status || "completed",
  };
}

function mapInv(item: ApiInvoice): Invoice {
  return {
    id: item.id || "", number: item.invoiceNumber || "", client: item.client || item.bookingId || "",
    amount: item.totalAmount || item.amount || 0, status: item.status || "draft",
    dueDate: item.dueDate || "", items: (item.lineItems || []).map(li => li.description || ""),
  };
}
function mapInvToApi(item: Partial<Invoice>): InvoiceApiPayload {
  return {
    invoice_number: item.number, total_amount: item.amount, status: item.status,
    due_date: item.dueDate, line_items: (item.items || []).map(d => ({ description: d, quantity: 1, unit_price: 0, total: 0 })),
    issue_date: new Date().toISOString().split("T")[0],
    subtotal: item.amount || 0,
  };
}

function mapExp(item: ApiExpense): Expense {
  return {
    id: item.id || "", category: item.category || "Other",
    description: item.description || "", amount: item.amount || 0,
    date: item.expenseDate?.split("T")[0] || "", status: item.status || "approved",
    receipt: item.receiptUrl || "",
  };
}
function mapExpToApi(item: Partial<Expense>): ExpenseApiPayload {
  return {
    category: item.category, description: item.description, amount: item.amount,
    expense_date: item.date, receipt_url: item.receipt,
  };
}

function mapPayout(item: ApiPayout): Payout {
  return {
    id: item.id || "",
    supplierId: item.supplierId || "",
    supplierName: item.supplierName || "Unknown supplier",
    bookingId: item.bookingId || null,
    bookingReference: item.bookingReference || null,
    amount: item.amount || 0,
    currency: item.currency || "USD",
    status: (item.status as Payout["status"]) || "scheduled",
    scheduledDate: item.scheduledDate || undefined,
    paidDate: item.paidDate || undefined,
    method: item.method || "",
    reference: item.reference || "",
    notes: item.notes || "",
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

const payoutStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "text-gray-600", bg: "bg-gray-100" },
  processing: { label: "Processing", color: "text-blue-600", bg: "bg-blue-50" },
  paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50" },
  failed: { label: "Failed", color: "text-red-600", bg: "bg-red-50" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50" },
};

const PAYOUT_CURRENCIES = ["USD", "EUR", "GBP", "ZMW", "ZAR"];
const PAYOUT_METHODS = ["Bank Transfer", "SWIFT", "Mobile Money", "Cash", "Card"];

type Tab = "transactions" | "invoices" | "payouts" | "expenses";

const EXPENSE_CATEGORIES = ["Marketing", "Operations", "Staff", "Travel", "Technology"];
const PAYMENT_METHODS = ["Stripe", "Bank Transfer", "PayPal", "Credit Card"];

export default function AdminFinance() {
  const { data: transactions, loading: loadTx, create: createTx, update: updateTx, remove: removeTx } = useApiData("finance/transactions", { mapFromApi: mapTrans, mapToApi: mapTransToApi });
  const { data: invoices, loading: loadInv, create: createInv, update: updateInv, remove: removeInv } = useApiData("finance/invoices", { mapFromApi: mapInv, mapToApi: mapInvToApi });
  const { data: expenses, loading: loadExp, create: createExp, update: updateExp, remove: removeExp } = useApiData("finance/expenses", { mapFromApi: mapExp, mapToApi: mapExpToApi });

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<Tab>("transactions");
  const [editItem, setEditItem] = useState<Transaction | Invoice | Expense | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // ─── Payouts (custom API with supplier join) ──────
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [payoutFilter, setPayoutFilter] = useState("all");
  const [updatingPayout, setUpdatingPayout] = useState<string | null>(null);

  // Pure fetch helper — no setState, safe to call from effect and handlers.
  const fetchPayoutRows = useCallback(async (status: string): Promise<Payout[]> => {
    const res = await fetch(`/api/admin/finance/payouts?status=${status}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map(mapPayout);
  }, []);

  // Event-handler refresh (buttons/modal) — shows fresh rows for the active filter.
  const refreshPayouts = useCallback(async () => {
    setPayouts(await fetchPayoutRows(payoutFilter));
  }, [fetchPayoutRows, payoutFilter]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rows = await fetchPayoutRows(payoutFilter);
        if (!cancelled) setPayouts(rows);
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoadingPayouts(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchPayoutRows, payoutFilter]);

  // Load supplier options for the payout form on first open of the modal.
  useEffect(() => {
    if (!showModal || modalType !== "payouts" || suppliers.length > 0) return;
    void (async () => {
      try {
        const res = await fetch("/api/admin/suppliers?limit=200");
        if (res.ok) {
          const json = await res.json();
          const rows: { id: string; name: string }[] = json.data || [];
          setSuppliers(rows.map(r => ({ id: r.id, name: r.name })));
        }
      } catch {
        /* non-critical */
      }
    })();
  }, [showModal, modalType, suppliers.length]);

  const handlePayoutStatus = async (payout: Payout, nextStatus: Payout["status"]) => {
    setUpdatingPayout(payout.id);
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast(`Payout marked ${nextStatus}`, "success");
        void refreshPayouts();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to update payout", "error");
      }
    } catch {
      toast("Failed to update payout", "error");
    }
    setUpdatingPayout(null);
  };

  const loading = loadTx || loadInv || loadExp || loadingPayouts;

  const tabs: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "invoices", label: "Invoices" },
    { id: "payouts", label: "Payouts" },
    { id: "expenses", label: "Expenses" },
  ];

  const getStats = () => {
    const totalRevenue = transactions.filter(t => t.type === "credit" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
    const paidPayouts = payouts.filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0);
    const totalExpensesCalc = [...transactions.filter(t => t.type === "debit" && t.status === "completed"), ...expenses].reduce((a, t) => a + t.amount, 0) + paidPayouts;
    const outstandingPayouts = payouts.filter(p => p.status === "scheduled" || p.status === "processing").reduce((a, p) => a + p.amount, 0);
    return [
      { label: "Total Revenue", value: `$${(totalRevenue || 0).toLocaleString()}`, color: "text-emerald-600" },
      { label: "Total Expenses", value: `$${(totalExpensesCalc || 0).toLocaleString()}`, color: "text-red-600" },
      { label: "Net Profit", value: `$${((totalRevenue || 0) - (totalExpensesCalc || 0)).toLocaleString()}`, color: "text-indigo-600" },
      { label: "Outstanding Payouts", value: `$${(outstandingPayouts || 0).toLocaleString()}`, color: "text-amber-600" },
    ];
  };

  const openAddModal = (type: Tab) => {
    setModalType(type);
    setEditItem(null);
    if (type === "invoices") setFormData({ number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`, client: "", amount: "", status: "draft", dueDate: "" });
    else if (type === "payouts") setFormData({ supplierId: "", amount: "", currency: "USD", date: "", status: "scheduled", reference: "", method: "Bank Transfer", notes: "" });
    else if (type === "expenses") setFormData({ category: "Marketing", description: "", amount: "", date: "", status: "pending", receipt: "" });
    else setFormData({ description: "", amount: "", type: "credit", method: "Stripe", status: "completed", date: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (modalType === "invoices") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
      const result = editItem ? await updateInv(editItem.id, payload) : await createInv(payload);
      if (result) { toast("Invoice saved", "success"); setShowModal(false); } else toast("Failed to save invoice", "error");
    } else if (modalType === "expenses") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
      const result = editItem ? await updateExp(editItem.id, payload) : await createExp(payload);
      if (result) { toast("Expense saved", "success"); setShowModal(false); } else toast("Failed to save expense", "error");
    } else if (modalType === "transactions") {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0, date: new Date().toISOString().split("T")[0] };
      const result = editItem ? await updateTx(editItem.id, payload) : await createTx(payload);
      if (result) { toast("Transaction saved", "success"); setShowModal(false); } else toast("Failed to save transaction", "error");
    } else if (modalType === "payouts") {
      try {
        const res = await fetch("/api/admin/finance/payouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: formData.supplierId,
            amount: parseFloat(formData.amount) || 0,
            currency: formData.currency || "USD",
            scheduledDate: formData.date || null,
            reference: formData.reference || null,
            method: formData.method || null,
            notes: formData.notes || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create payout");
        }
        toast("Payout scheduled", "success");
        setShowModal(false);
        void refreshPayouts();
      } catch (err: unknown) {
        toast(`Failed to create payout: ${err instanceof Error ? err.message : "unknown error"}`, "error");
      }
    }
  };

  const handleDelete = async (type: Tab, id: string) => {
    let ok = false;
    if (type === "invoices") ok = await removeInv(id);
    else if (type === "expenses") ok = await removeExp(id);
    else if (type === "transactions") ok = await removeTx(id);
    else if (type === "payouts") {
      try {
        const res = await fetch(`/api/admin/finance/payouts/${id}`, { method: "DELETE" });
        if (res.ok) {
          ok = true;
          void refreshPayouts();
        } else {
          const err = await res.json();
          toast(err.error || "Failed to delete payout", "error");
        }
      } catch {
        toast("Failed to delete payout", "error");
      }
    } else ok = true;
    if (ok) toast("Deleted successfully", "success");
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Finance</h1><p className="text-earth mt-1">Manage transactions, invoices, and expenses</p></div>
        <button onClick={() => openAddModal(activeTab)} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">
          <Plus className="w-4 h-4" />Add {activeTab === "invoices" ? "Invoice" : activeTab === "payouts" ? "Payout" : activeTab === "expenses" ? "Expense" : "Transaction"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4"><SkeletonText className="w-full h-20" /><SkeletonText className="w-full h-64" /></div>
      ) : (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {getStats().map(stat => (
            <div key={stat.label} className="bg-white p-4 border border-sand-light">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-earth">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 border-b border-sand-light pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${activeTab === tab.id ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-sand-light overflow-hidden">
          {activeTab === "transactions" && (
            <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Method</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{transactions.map(t => (<tr key={t.id} className="hover:bg-warm-white"><td className="px-4 py-3 text-earth">{t.date}</td><td className="px-4 py-3 text-soft-black">{t.description}</td><td className="px-4 py-3 text-earth">{t.method}</td><td className={`px-4 py-3 font-medium ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "credit" ? "+" : "-"}${(t.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(t); setFormData({ id: t.id, description: t.description, amount: t.amount.toString(), type: t.type, method: t.method, status: t.status, date: t.date }); setModalType("transactions"); setShowModal(true); }} className="text-xs text-gold mr-3 hover:underline">Edit</button><button onClick={() => handleDelete("transactions", t.id)} className="text-xs text-red-500 hover:underline">Delete</button></td></tr>))}</tbody></table>
          )}
          {activeTab === "invoices" && (
            <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Invoice #</th><th className="text-left px-4 py-3 font-medium text-earth">Client</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Due Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{invoices.map(inv => (<tr key={inv.id} className="hover:bg-warm-white"><td className="px-4 py-3 font-medium text-soft-black">{inv.number}</td><td className="px-4 py-3 text-earth">{inv.client}</td><td className="px-4 py-3 font-medium text-soft-black">${(inv.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-earth">{inv.dueDate}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${invoiceStatusConfig[inv.status]?.bg || "bg-gray-50"} ${invoiceStatusConfig[inv.status]?.color || "text-gray-600"}`}>{invoiceStatusConfig[inv.status]?.label || inv.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(inv); setFormData({ id: inv.id, number: inv.number, client: inv.client, amount: inv.amount.toString(), status: inv.status, dueDate: inv.dueDate }); setModalType("invoices"); setShowModal(true); }} className="text-xs text-gold mr-3 hover:underline">Edit</button><button onClick={() => handleDelete("invoices", inv.id)} className="text-xs text-red-500 hover:underline">Delete</button></td></tr>))}</tbody></table>
          )}
          {activeTab === "payouts" && (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-sand-light bg-warm-white">
                <Banknote className="w-4 h-4 text-earth" />
                <select value={payoutFilter} onChange={(e) => setPayoutFilter(e.target.value)}
                  className="px-3 py-1.5 border border-sand-light text-xs focus:outline-none focus:border-gold bg-white">
                  <option value="all">All Statuses</option>
                  {Object.entries(payoutStatusConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Supplier</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Scheduled</th><th className="text-left px-4 py-3 font-medium text-earth">Paid</th><th className="text-left px-4 py-3 font-medium text-earth">Reference</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{payouts.map(p => (<tr key={p.id} className="hover:bg-warm-white"><td className="px-4 py-3"><p className="font-medium text-soft-black">{p.supplierName}</p>{p.bookingReference && <p className="text-[11px] text-earth">{p.bookingReference}</p>}</td><td className="px-4 py-3 font-medium text-soft-black">{p.currency} {Number(p.amount).toLocaleString()}</td><td className="px-4 py-3 text-earth">{p.scheduledDate || "—"}</td><td className="px-4 py-3 text-earth">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "—"}</td><td className="px-4 py-3 text-earth">{p.reference || "—"}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${payoutStatusConfig[p.status]?.bg || "bg-gray-50"} ${payoutStatusConfig[p.status]?.color || "text-gray-600"}`}>{payoutStatusConfig[p.status]?.label || p.status}</span></td><td className="px-4 py-3 text-right whitespace-nowrap">
                {updatingPayout === p.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-earth inline" />
                ) : p.status === "scheduled" ? (
                  <button onClick={() => handlePayoutStatus(p, "processing")} className="text-xs text-blue-600 hover:underline mr-2">Start</button>
                ) : p.status === "processing" ? (
                  <>
                    <button onClick={() => handlePayoutStatus(p, "paid")} className="text-xs text-emerald-600 hover:underline mr-2">Mark Paid</button>
                    <button onClick={() => handlePayoutStatus(p, "failed")} className="text-xs text-red-500 hover:underline mr-2">Fail</button>
                  </>
                ) : null}
                <button onClick={() => handleDelete("payouts", p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </td></tr>))}
              {payouts.length === 0 && !loadingPayouts && (<tr><td colSpan={7} className="px-4 py-8 text-center text-earth text-sm">No payouts found. Schedule your first supplier payout to get started.</td></tr>)}
              </tbody></table>
            </>
          )}
          {activeTab === "expenses" && (
            <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Category</th><th className="text-left px-4 py-3 font-medium text-earth">Description</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Date</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{expenses.map(e => (<tr key={e.id} className="hover:bg-warm-white"><td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded">{e.category}</span></td><td className="px-4 py-3 text-soft-black">{e.description}</td><td className="px-4 py-3 font-medium text-soft-black">${(e.amount || 0).toLocaleString()}</td><td className="px-4 py-3 text-earth">{e.date}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${e.status === "approved" ? "bg-emerald-50 text-emerald-700" : e.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{e.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => { setEditItem(e); setFormData({ id: e.id, category: e.category, description: e.description, amount: e.amount.toString(), date: e.date, status: e.status }); setModalType("expenses"); setShowModal(true); }} className="text-xs text-gold mr-3 hover:underline">Edit</button><button onClick={() => handleDelete("expenses", e.id)} className="text-xs text-red-500 hover:underline">Delete</button></td></tr>))}</tbody></table>
          )}
        </div>
      </>
      )}

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editItem ? "Edit" : "Add"} {modalType === "invoices" ? "Invoice" : modalType === "payouts" ? "Payout" : modalType === "expenses" ? "Expense" : "Transaction"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {modalType === "invoices" && (<><FormInput label="Invoice Number" name="number" value={formData.number || ""} onChange={e => setFormData({ ...formData, number: e.target.value })} /><FormInput label="Client Name" name="client" value={formData.client || ""} onChange={e => setFormData({ ...formData, client: e.target.value })} /><FormInput label="Amount" name="amount" type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} /><FormInput label="Due Date" name="dueDate" type="date" value={formData.dueDate || ""} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /><FormSelect label="Status" name="status" value={formData.status || "draft"} onChange={e => setFormData({ ...formData, status: e.target.value })} options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "partial", label: "Partial" }, { value: "paid", label: "Paid" }]} /></>)}
                {modalType === "payouts" && (<>
                  <FormSelect label="Supplier" name="supplierId" value={formData.supplierId || ""} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                    placeholder="Select supplier..."
                    options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Amount" name="amount" type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    <FormSelect label="Currency" name="currency" value={formData.currency || "USD"} onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      options={PAYOUT_CURRENCIES.map(c => ({ value: c, label: c }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Scheduled Date" name="date" type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    <FormSelect label="Method" name="method" value={formData.method || "Bank Transfer"} onChange={e => setFormData({ ...formData, method: e.target.value })}
                      options={PAYOUT_METHODS.map(m => ({ value: m, label: m }))} />
                  </div>
                  <FormInput label="Reference" name="reference" value={formData.reference || ""} onChange={e => setFormData({ ...formData, reference: e.target.value })} placeholder="e.g. SWIFT ref or transfer ID" />
                  <FormTextarea label="Notes" name="notes" value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </>)}
                {modalType === "expenses" && (<><FormSelect label="Category" name="category" value={formData.category || "Marketing"} onChange={e => setFormData({ ...formData, category: e.target.value })} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} /><FormInput label="Description" name="description" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /><FormInput label="Amount" name="amount" type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} /><FormInput label="Date" name="date" type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} /></>)}
                {modalType === "transactions" && (<><FormInput label="Description" name="description" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /><FormInput label="Amount" name="amount" type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} /><div className="grid grid-cols-2 gap-4"><FormSelect label="Type" name="type" value={formData.type || "credit"} onChange={e => setFormData({ ...formData, type: e.target.value })} options={[{ value: "credit", label: "Credit" }, { value: "debit", label: "Debit" }]} /><FormSelect label="Method" name="method" value={formData.method || "Stripe"} onChange={e => setFormData({ ...formData, method: e.target.value })} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} /></div></>)}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
