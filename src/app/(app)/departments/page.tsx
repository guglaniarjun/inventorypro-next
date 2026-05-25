"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Package, Box, Users, Search } from "lucide-react";
import { toast } from "sonner";

interface Dept {
  id: number; departmentName: string; departmentCode: string;
  inchargeName: string | null; location: string | null; phone: string | null;
  itemCount: number; assetCount: number; userCount: number;
}

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ departmentName: "", departmentCode: "", inchargeName: "", location: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/departments?search=${encodeURIComponent(search)}&limit=100`)
      .then((r) => r.json())
      .then((d: { data: Dept[] }) => { setDepts(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/departments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { toast.success("Department created"); setShowAdd(false); setForm({ departmentName: "", departmentCode: "", inchargeName: "", location: "", phone: "" }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground text-sm">{depts.length} departments</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map((d) => (
            <Link key={d.id} href={`/departments/${d.id}`} className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
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
          ))}
          {depts.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No departments found</p>}
        </div>
      )}

      {/* Add Dialog */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Add Department</h2>
            {[
              { label: "Department Name *", key: "departmentName", required: true },
              { label: "Department Code *", key: "departmentCode", required: true },
              { label: "In-charge Name", key: "inchargeName", required: false },
              { label: "Location", key: "location", required: false },
              { label: "Phone", key: "phone", required: false },
            ].map(({ label, key, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={required} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
