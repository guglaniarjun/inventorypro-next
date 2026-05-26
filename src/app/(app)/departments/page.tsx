"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Package, Box, Users, Search, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Dept {
  id: number; departmentName: string; departmentCode: string;
  inchargeName: string | null; location: string | null; phone: string | null;
  itemCount: number; assetCount: number; userCount: number;
}

type FormData = { departmentName: string; departmentCode: string; inchargeName: string; location: string; phone: string; };
const EMPTY: FormData = { departmentName: "", departmentCode: "", inchargeName: "", location: "", phone: "" };
const FIELDS: { label: string; key: keyof FormData; required: boolean }[] = [
  { label: "Department Name *", key: "departmentName", required: true },
  { label: "Department Code *", key: "departmentCode", required: true },
  { label: "In-charge Name", key: "inchargeName", required: false },
  { label: "Location", key: "location", required: false },
  { label: "Phone", key: "phone", required: false },
];

function DeptModal({ title, data, setData, onSubmit, onClose, saving }: {
  title: string; data: FormData; setData: (f: FormData) => void;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>
        {FIELDS.map(({ label, key, required }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} required={required}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        ))}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormData>({ ...EMPTY });

  const [editDept, setEditDept] = useState<Dept | null>(null);
  const [editForm, setEditForm] = useState<FormData>({ ...EMPTY });

  const [confirmDel, setConfirmDel] = useState<Dept | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json())
      .then((u: { role?: string }) => {
        setIsAdmin(["admin", "tenant_super_admin", "platform_super_admin"].includes(u?.role ?? ""));
      }).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    fetch(`/api/departments?search=${encodeURIComponent(search)}&limit=100`)
      .then(r => r.json())
      .then((d: { data?: Dept[] }) => { setDepts(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
    setSaving(false);
    if (res.ok) { toast.success("Department created"); setShowAdd(false); setAddForm({ ...EMPTY }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  function openEdit(d: Dept) {
    setEditDept(d);
    setEditForm({ departmentName: d.departmentName, departmentCode: d.departmentCode, inchargeName: d.inchargeName ?? "", location: d.location ?? "", phone: d.phone ?? "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editDept) return; setSaving(true);
    const res = await fetch(`/api/departments/${editDept.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false);
    if (res.ok) { toast.success("Department updated"); setEditDept(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  async function handleDelete() {
    if (!confirmDel) return; setSaving(true);
    const res = await fetch(`/api/departments/${confirmDel.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { toast.success("Department deleted"); setConfirmDel(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed to delete — it may still have items or assets"); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Departments</h1><p className="text-muted-foreground text-sm">{depts.length} departments</p></div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
            <Plus className="w-4 h-4" /> Add Department
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search departments..."
          className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(d => (
            <div key={d.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow group relative">
              <Link href={`/departments/${d.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
                  <div className="flex-1 min-w-0 pr-14">
                    <p className="font-semibold truncate">{d.departmentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{d.departmentCode}</p>
                    {d.inchargeName && <p className="text-xs text-muted-foreground mt-0.5">In-charge: {d.inchargeName}</p>}
                  </div>
                </div>
                <div className="flex gap-4 mt-4 pt-3 border-t border-border text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Package className="w-3.5 h-3.5" />{d.itemCount} items</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Box className="w-3.5 h-3.5" />{d.assetCount} assets</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" />{d.userCount}</span>
                </div>
              </Link>
              {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.preventDefault(); openEdit(d); }} title="Edit"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.preventDefault(); setConfirmDel(d); }} title="Delete"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {depts.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No departments found</p>}
        </div>
      )}

      {showAdd && <DeptModal title="Add Department" data={addForm} setData={setAddForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} saving={saving} />}
      {editDept && <DeptModal title={`Edit: ${editDept.departmentName}`} data={editForm} setData={setEditForm} onSubmit={handleEdit} onClose={() => setEditDept(null)} saving={saving} />}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete Department?</h2>
            <p className="text-sm text-muted-foreground">Delete <strong>{confirmDel.departmentName}</strong>? This cannot be undone and will fail if the department has items or assets.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-60">{saving ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
