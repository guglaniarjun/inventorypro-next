"use client";
import { useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Audit { id: number; auditTitle: string; auditType: string; departmentName: string; auditDate: string; status: string; totalItems: number; shortageCount: number; }

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [depts, setDepts] = useState<Array<{ id: number; departmentName: string }>>([]);
  const [form, setForm] = useState({ auditTitle: "", auditType: "inventory", departmentId: "", auditDate: new Date().toISOString().slice(0, 10), remarks: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/audits?limit=100").then(r => r.json()).then((d: { data: Audit[] }) => { setAudits(d.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); fetch("/api/departments?limit=100").then(r => r.json()).then((d: { data: typeof depts }) => setDepts(d.data)); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.departmentId) { toast.error("Select a department"); return; }
    setSaving(true);
    const res = await fetch("/api/audits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, departmentId: parseInt(form.departmentId) }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Audit created"); setShowAdd(false); setForm({ auditTitle: "", auditType: "inventory", departmentId: "", auditDate: new Date().toISOString().slice(0, 10), remarks: "" }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  const statusColor = (s: string) => ({ Draft: "bg-gray-100 text-gray-700", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700" }[s] ?? "bg-secondary text-secondary-foreground");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Audits</h1><p className="text-sm text-muted-foreground">{audits.length} audit sessions</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500"><Plus className="w-4 h-4" /> New Audit</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {audits.map(a => (
            <Link key={a.id} href={`/audits/${a.id}`} className="flex items-center justify-between bg-white border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="font-semibold text-sm">{a.auditTitle}</p>
                  <p className="text-xs text-muted-foreground">{a.departmentName} · {formatDate(a.auditDate)} · {a.auditType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.shortageCount > 0 && <span className="text-xs text-red-600 font-medium">{a.shortageCount} shortage(s)</span>}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
              </div>
            </Link>
          ))}
          {audits.length === 0 && <p className="text-center text-muted-foreground py-12">No audits yet</p>}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">New Audit Session</h2>
            <div><label className="block text-sm font-medium mb-1">Audit Title *</label><input value={form.auditTitle} onChange={e => setForm(f => ({ ...f, auditTitle: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Audit Type</label>
              <select value={form.auditType} onChange={e => setForm(f => ({ ...f, auditType: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="inventory">Inventory</option><option value="assets">Assets</option><option value="full">Full Audit</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Department *</label>
              <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Audit Date *</label><input type="date" value={form.auditDate} onChange={e => setForm(f => ({ ...f, auditDate: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
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
