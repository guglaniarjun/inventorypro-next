"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Audit {
  id: number; auditTitle: string; auditType: string; departmentName: string;
  departmentId: number; auditDate: string; status: string;
  totalItems: number; shortageCount: number; excessCount: number; damagedCount: number;
  remarks: string | null;
}
interface AuditItem {
  id: number; referenceName: string; referenceCode: string;
  expectedQuantity: number; physicalQuantity: number; difference: number;
  conditionFound: string | null; damageStatus: string | null; remarks: string | null;
}
interface InvItem { id: number; itemName: string; itemCode: string; currentStock: number; }
interface AssetItem { id: number; assetName: string; assetCode: string; quantity: number; }

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [finalRemarks, setFinalRemarks] = useState("");

  const [invItems, setInvItems] = useState<InvItem[]>([]);
  const [assetItems, setAssetItems] = useState<AssetItem[]>([]);

  const [form, setForm] = useState({
    referenceId: "", referenceName: "", referenceCode: "",
    expectedQuantity: "0", physicalQuantity: "0",
    conditionFound: "", damageStatus: "", remarks: "",
  });

  const load = () => {
    fetch(`/api/audits/${id}`)
      .then(r => r.json())
      .then((d: Audit & { items: AuditItem[] }) => {
        setAudit({
          id: d.id, auditTitle: d.auditTitle, auditType: d.auditType,
          departmentName: d.departmentName, departmentId: d.departmentId,
          auditDate: d.auditDate, status: d.status,
          totalItems: d.totalItems, shortageCount: d.shortageCount,
          excessCount: d.excessCount, damagedCount: d.damagedCount, remarks: d.remarks,
        });
        setFinalRemarks(d.remarks ?? "");
        setItems(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  // Load department-specific items based on audit type
  useEffect(() => {
    if (!audit?.departmentId) return;
    const isAsset = audit.auditType?.toLowerCase().includes("asset");
    if (isAsset) {
      fetch(`/api/assets?departmentId=${audit.departmentId}&limit=200`)
        .then(r => r.json())
        .then((d: { data: AssetItem[] }) => setAssetItems(d.data));
    } else {
      fetch(`/api/inventory/items?departmentId=${audit.departmentId}&limit=200`)
        .then(r => r.json())
        .then((d: { data: InvItem[] }) => setInvItems(d.data));
    }
  }, [audit?.departmentId, audit?.auditType]);

  function onSelectItem(val: string) {
    const isAsset = audit?.auditType?.toLowerCase().includes("asset");
    if (isAsset) {
      const asset = assetItems.find(a => String(a.id) === val);
      if (asset) setForm(f => ({
        ...f, referenceId: val, referenceName: asset.assetName,
        referenceCode: asset.assetCode, expectedQuantity: String(asset.quantity),
      }));
    } else {
      const item = invItems.find(i => String(i.id) === val);
      if (item) setForm(f => ({
        ...f, referenceId: val, referenceName: item.itemName,
        referenceCode: item.itemCode, expectedQuantity: String(item.currentStock),
      }));
    }
  }

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
        damageStatus: form.damageStatus || null,
        remarks: form.remarks || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Item recorded");
      setShowAdd(false);
      setForm({ referenceId: "", referenceName: "", referenceCode: "", expectedQuantity: "0", physicalQuantity: "0", conditionFound: "", damageStatus: "", remarks: "" });
      load();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed");
    }
  }

  async function updateStatus(status: string) {
    await fetch(`/api/audits/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Audit marked as ${status}`);
    load();
  }

  async function saveFinalRemarks() {
    setSavingRemarks(true);
    const res = await fetch(`/api/audits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks: finalRemarks }),
    });
    setSavingRemarks(false);
    if (res.ok) toast.success("Final remarks saved");
    else toast.error("Failed to save remarks");
  }

  if (loading) return <div className="p-6"><div className="h-32 bg-muted animate-pulse rounded-xl" /></div>;
  if (!audit) return <div className="p-6 text-center text-muted-foreground">Audit not found</div>;

  const isAsset = audit.auditType?.toLowerCase().includes("asset");
  const statusColor = { Draft: "bg-gray-100 text-gray-700", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700" }[audit.status] ?? "bg-secondary text-secondary-foreground";
  const dropdownItems = isAsset
    ? assetItems.map(a => ({ id: a.id, label: `${a.assetName} (${a.assetCode}) — Qty: ${a.quantity}` }))
    : invItems.map(i => ({ id: i.id, label: `${i.itemName} (${i.itemCode}) — Stock: ${i.currentStock}` }));

  const inputCls = "w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

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
            <span>·</span>
            <span className="capitalize">{audit.auditType} Audit</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{audit.status}</span>
          </div>
        </div>
        {audit.status !== "Completed" && (
          <div className="flex gap-2">
            {audit.status === "Draft" && (
              <button onClick={() => updateStatus("In Progress")} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">Start Audit</button>
            )}
            {audit.status === "In Progress" && (
              <button onClick={() => updateStatus("Completed")} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500">Mark Complete</button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
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

      {/* Audit Items Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {isAsset ? "Assets Audited" : "Items Audited"}
            <span className="ml-2 text-muted-foreground font-normal">({audit.departmentName})</span>
          </h2>
          {audit.status !== "Completed" && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500">
              <Plus className="w-3 h-3" /> Add {isAsset ? "Asset" : "Item"}
            </button>
          )}
        </div>
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name / Code</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Expected</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Physical</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Diff</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Condition</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Damage</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(item => (
                  <tr key={item.id} className={`hover:bg-muted/30 ${item.difference < 0 ? "bg-red-50/50" : item.difference > 0 ? "bg-green-50/50" : ""}`}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.referenceName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{item.referenceCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.expectedQuantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.physicalQuantity}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {item.difference > 0 ? "+" : ""}{item.difference}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.conditionFound ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.damageStatus ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">{item.remarks ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-sm">No items recorded yet</p>
            <p className="text-xs mt-1">Items from <strong>{audit.departmentName}</strong> will appear in the dropdown when you add</p>
          </div>
        )}
      </div>

      {/* Auditor Final Report */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Auditor&apos;s Final Report</h2>
        </div>
        <p className="text-xs text-muted-foreground">Write the overall findings, observations, and recommendations for this audit. This will appear in the audit report.</p>
        <textarea
          value={finalRemarks}
          onChange={e => setFinalRemarks(e.target.value)}
          rows={5}
          placeholder="Summarize audit findings, discrepancies observed, recommended actions, and any additional remarks..."
          className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex justify-end">
          <button onClick={saveFinalRemarks} disabled={savingRemarks} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">
            {savingRemarks ? "Saving..." : "Save Final Report"}
          </button>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddItem} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Record Audit {isAsset ? "Asset" : "Item"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {isAsset ? "assets" : "items"} from <strong>{audit.departmentName}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select from Department</label>
              <select onChange={e => onSelectItem(e.target.value)} className={inputCls}>
                <option value="">— or enter manually below —</option>
                {dropdownItems.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              {dropdownItems.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No {isAsset ? "assets" : "items"} found for this department. Enter manually below.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input value={form.referenceName} onChange={e => setForm(f => ({ ...f, referenceName: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input value={form.referenceCode} onChange={e => setForm(f => ({ ...f, referenceCode: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition Found</label>
                <select value={form.conditionFound} onChange={e => setForm(f => ({ ...f, conditionFound: e.target.value }))} className={inputCls}>
                  <option value="">Not specified</option>
                  {["Good","Fair","Poor","Damaged","Missing"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected Qty</label>
                <input type="number" min={0} value={form.expectedQuantity} onChange={e => setForm(f => ({ ...f, expectedQuantity: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Physical Qty</label>
                <input type="number" min={0} value={form.physicalQuantity} onChange={e => setForm(f => ({ ...f, physicalQuantity: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Damage Status</label>
                <select value={form.damageStatus} onChange={e => setForm(f => ({ ...f, damageStatus: e.target.value }))} className={inputCls}>
                  <option value="">None</option>
                  {["Minor Damage","Major Damage","Damaged","Beyond Repair"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
            </div>

            {/* Quick difference preview */}
            {form.expectedQuantity && form.physicalQuantity && (
              <div className={`text-sm rounded-lg px-3 py-2 font-medium ${
                parseInt(form.physicalQuantity) < parseInt(form.expectedQuantity) ? "bg-red-50 text-red-700" :
                parseInt(form.physicalQuantity) > parseInt(form.expectedQuantity) ? "bg-green-50 text-green-700" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                Difference: {parseInt(form.physicalQuantity) - parseInt(form.expectedQuantity) > 0 ? "+" : ""}
                {parseInt(form.physicalQuantity) - parseInt(form.expectedQuantity)}
                {parseInt(form.physicalQuantity) < parseInt(form.expectedQuantity) && " (Shortage)"}
                {parseInt(form.physicalQuantity) > parseInt(form.expectedQuantity) && " (Excess)"}
                {parseInt(form.physicalQuantity) === parseInt(form.expectedQuantity) && " (Match)"}
              </div>
            )}

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
