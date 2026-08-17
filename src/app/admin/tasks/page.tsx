"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Clock, AlertCircle, CheckCircle2, ListTodo, CalendarClock, User } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "cancelled";
  dueDate?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-gray-600", bg: "bg-gray-50" },
  medium: { label: "Medium", color: "text-blue-700", bg: "bg-blue-50" },
  high: { label: "High", color: "text-amber-700", bg: "bg-amber-50" },
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-50" },
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: "To Do", color: "text-gray-600", bg: "bg-gray-100" },
  in_progress: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-50" },
  done: { label: "Done", color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { label: "Cancelled", color: "text-gray-400", bg: "bg-gray-100" },
};

const TASK_STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
};

export default function AdminTasks() {
  const { data: tasks, loading, create, update, remove } = useApiData<TaskItem>("tasks");
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadStaff = async () => {
    if (staffLoaded) return;
    try {
      const res = await fetch("/api/admin/staff");
      if (res.ok) {
        const body = (await res.json()) as { data: StaffMember[] };
        setStaff(body.data || []);
        setStaffLoaded(true);
      }
    } catch {
      /* staff list is non-critical */
    }
  };

  const filtered = statusFilter === "all"
    ? tasks
    : tasks.filter((t) => t.status === statusFilter);

  const isOverdue = (t: TaskItem) =>
    !!t.dueDate && t.status !== "done" && t.status !== "cancelled" && new Date(t.dueDate) < new Date();

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingTask(null);
  };

  const openAddModal = () => {
    resetForm();
    void loadStaff();
    setShowModal(true);
  };

  const openEditModal = (task: TaskItem) => {
    void loadStaff();
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigneeId: task.assigneeId || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast("Title is required.", "error");
      return;
    }
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      assigneeId: formData.assigneeId || null,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    };

    const result = editingTask
      ? await update(editingTask.id, payload)
      : await create(payload);

    if (result) {
      toast(editingTask ? "Task updated." : "Task created.", "success");
      setShowModal(false);
      resetForm();
    } else {
      toast("Could not save the task.", "error");
    }
  };

  const handleQuickStatus = async (task: TaskItem, status: string) => {
    const ok = await update(task.id, { ...task, status });
    if (ok) toast("Task status updated.", "success");
    else toast("Could not update status.", "error");
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      toast("Task deleted.", "success");
      setDeleteConfirm(null);
    } else {
      toast("Could not delete the task.", "error");
    }
  };

  const staffName = (id?: string | null) => {
    if (!id) return undefined;
    return staff.find((m) => m.id === id)?.name;
  };

  const openCount = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center rounded-full">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{openCount}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Open</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 text-red-500 flex items-center justify-center rounded-full">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{overdueCount}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{doneCount}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Done</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 text-gold flex items-center justify-center rounded-full">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">
                {tasks.filter((t) => t.dueDate && t.status !== "done" && t.status !== "cancelled" && new Date(t.dueDate) >= new Date()).length}
              </p>
              <p className="text-xs text-earth uppercase tracking-wider">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "All" },
            ...TASK_STATUSES,
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                statusFilter === s.value
                  ? "bg-soft-black text-white border-soft-black"
                  : "bg-white text-earth border-sand-light hover:border-earth/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-soft-black hover:bg-earth transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <SkeletonText lines={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks"
          description={statusFilter === "all" ? "Create your first team task to get started." : "No tasks match this filter."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const pr = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
            const st = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className={`bg-white border border-sand-light p-4 flex items-start gap-3 hover:border-earth/30 transition-colors ${
                  task.status === "done" ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() =>
                    handleQuickStatus(task, task.status === "done" ? "todo" : "done")
                  }
                  title={task.status === "done" ? "Reopen task" : "Mark done"}
                  className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                    task.status === "done"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-sand-dark hover:border-gold"
                  }`}
                >
                  {task.status === "done" && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-earth" : "text-soft-black"}`}>
                      {task.title}
                    </p>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium ${pr.color} ${pr.bg}`}>{pr.label}</span>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium ${st.color} ${st.bg}`}>{st.label}</span>
                    {overdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-red-700 bg-red-50">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-earth line-clamp-2">{task.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-earth">
                    {task.dueDate && (
                      <span className={`inline-flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : ""}`}>
                        <Clock className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {task.assigneeName || staffName(task.assigneeId) || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleQuickStatus(task, e.target.value)}
                    className="px-2 py-1 text-xs border border-sand-light bg-white focus:outline-none focus:border-gold"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-earth hover:text-soft-black hover:bg-warm-white rounded transition-colors"
                    title="Edit task"
                  >
                    <ListTodo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(task.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-soft-black/50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light">
                <h2 className="text-lg font-semibold text-soft-black">
                  {editingTask ? "Edit Task" : "New Task"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-earth hover:text-soft-black hover:bg-warm-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <FormInput
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Follow up on honeymoon package quote"
                />
                <FormTextarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Optional details for the assignee"
                />
                <FormGroup>
                  <FormSelect
                    label="Assignee"
                    options={[{ value: "", label: "Unassigned" }, ...staff.map((m) => ({ value: m.id, label: m.name }))]}
                    value={formData.assigneeId}
                    onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                  />
                  <FormSelect
                    label="Priority"
                    options={TASK_PRIORITIES}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <FormSelect
                    label="Status"
                    options={TASK_STATUSES}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  />
                  <FormInput
                    label="Due Date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </FormGroup>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-earth hover:text-soft-black border border-sand-light hover:border-earth/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-soft-black hover:bg-earth transition-colors"
                  >
                    {editingTask ? "Save Changes" : "Create Task"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-soft-black/50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-sm shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-soft-black mb-2">Delete this task?</h3>
              <p className="text-sm text-earth mb-4">This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-earth border border-sand-light hover:border-earth/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
