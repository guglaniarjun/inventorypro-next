"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Audit { id: number; auditTitle: string; auditType: string; departmentName: string; departmentId: number; auditDate: string; status: string; totalItems: number; shortageCount: number; excessCount: number; damagedCount: number; remarks: string | null; }
interface AuditItem { id: number; referenceName: string; referenceCode: string; expectedQuantity: number; physicalQuantity: number; difference: number; conditionFound: string | null; damageStatus: string | null; remarks: string | null; }

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invItems, setInvItems] = useState<Array<{ id: number; itemName: string; itemCode: string; currentStock: number }>>([]);
  const [form, setForm] = useState({ referenceId: "", referenceName: "", referenceCode: "", expectedQuantity: "0", physicalQuantity: "0", conditionFound: "", remarks: "" });

  const load = () => {
    fetch(`/api/audits/${id}`)
      .then(r => r.json())
      .then((d: Audit & { items: AuditItem[] }) => {
        setAudit({ id: d.id, auditTitle: d.auditTitle, auditType: d.auditType, departmentName: d.departmentName, departmentId: d.departmentId, auditDate: d.auditDate, status: d.status, totalItems: d.totalItems, shortageCount: d.shortageCount, excessCount: d.excessCount, damagedCount: d.damagedCount, remarks: d.remarks });
        setItems(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (audit?.departmentId) {
      fetch(`/api/inventory/items?departmentId=${audit.departmentId}&limit=200`)
        .then(r => r.json())
        .then((d: { data: typeof invItems }) => setInvItems(d.data));
    }
  }, [audit?.departmentId]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/audits/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId: parseInt(form.referenceId) || 0,
        referenceName: form.referenceName,
        referenceCode: form.referenceCode,
        expectedQuantity: parseInt(form.expectedQuantity) || 0,
        physicalQuantity: parseInt(form.physicalQuantity) || 0,
        conditionFound: form.conditionFound || null,
        remarks: form.remarks || null,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Item recorded"); setShowAdd(false); setForm({ referenceId: "", referenceName: "", referenceCode: "", expectedQuantity: "0", physicalQuantity: "0", conditionFound: "", remarks: "" }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  async function updateStatus(status: string) {
    await fetch(`/api/audits/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Audit marked as ${status}`);
    load();
  }

  function onSelectItem(invId: string) {
    const item = invItems.find(i => String(i.id) === invId);
    if (item) setForm(f => ({ ...f, referenceId: invId, referenceName: item.itemName, referenceCode: item.itemCode, expectedQuantity: String(item.currentStock) }));
  }

  if (loading) return <div className="p-6"><div className="h-32 bg-muted animate-pulse rounded-xl" /></div>;
  if (!audit) return <div className="p-6 text-center text-muted-foreground">Audit not found</div>;

  const statusColor = { Draft: "bg-gray-100 text-gray-700", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700" }[audit.status] ?? "bg-secondary text-secondary-foreground";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{audit.auditTitle}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{audit.departmentName}</span>
            <span>·</span>
            <span>{formatDate(audit.auditDate)}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{audit.status}</span>
          </div>
        </div>
        {audit.status !== "Completed" && (
          <div className="flex gap-2">
            {audit.status === "Draft" && <button onClick={() => updateStatus("In Progress")} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">Start Audit</button>}
            {audit.status === "In Progress" && <button onClick={() => updateStatus("Completed")} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500">Complete</button>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: audit.totalItems, color: "text-blue-600" },
          { label: "Shortages", value: audit.shortageCount, color: "text-red-600" },
          { label: "Excess", value: audit.excessCount, color: "text-green-600" },
          { label: "Damaged", value: audit.damagedCount, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Audit Items</h2>
          {audit.status !== "Completed" && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500"><Plus className="w-3 h-3" /> Add Item</button>
          )}
        </div>
        {items.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Expected</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Physical</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Diff</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Condition</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-muted/30 ${item.difference < 0 ? "bg-red-50/50" : item.difference > 0 ? "bg-green-50/50" : ""}`}>
                  <td className="px-4 py-2.5"><p className="font-medium">{item.referenceName}</p><p className="text-xs font-mono text-muted-foreground">{item.referenceCode}</p></td>
                  <td className="px-4 py-2.5 text-right font-mono">{item.expectedQuantity}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{item.physicalQuantity}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : "text-muted-foreground"}`}>{item.difference > 0 ? "+" : ""}{item.difference}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.conditionFound ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-center text-muted-foreground py-10 text-sm">No items recorded yet</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddItem} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Record Audit Item</h2>
            <div><label className="block text-sm font-medium mb-1">Select Item</label>
              <select onChange={e => onSelectItem(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— or enter manually below —</option>
                {invItems.map(i => <option key={i.id} value={i.id}>{i.itemName} ({i.itemCode}) — Stock: {i.currentStock}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Item Name *</label><input value={form.referenceName} onChange={e => setForm(f => ({ ...f, referenceName: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Item Code</label><input value={form.referenceCode} onChange={e => setForm(f => ({ ...f, referenceCode: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Expected Qty</label><input type="number" min={0} value={form.expectedQuantity} onChange={e => setForm(f => ({ ...f, expectedQuantity: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Physical Qty</label><input type="number" min={0} value={form.physicalQuantity} onChange={e => setForm(f => ({ ...f, physicalQuantity: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Condition Found</label>
              <select value={form.conditionFound} onChange={e => setForm(f => ({ ...f, conditionFound: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Not specified</option>
                {["Good","Fair","Poor","Damaged","Missing"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Remarks</label><textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Record"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
