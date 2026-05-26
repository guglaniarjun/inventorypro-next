"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, User, Wrench, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Asset {
  id: number; assetName: string; assetCode: string; assetCategory: string;
  condition: string; status: string; departmentName: string; departmentId: number;
  assignedToPersonName: string | null; locationPath: string | null;
  purchaseDate: string | null; purchaseValue: string | null;
  vendorName: string | null; invoiceNumber: string | null;
  warrantyStartDate: string | null; warrantyEndDate: string | null;
  amcDetails: string | null; remarks: string | null; assetPhoto: string | null;
  movements: Array<{ id: number; movementType: string; movementDate: string; fromDepartmentName: string | null; toDepartmentName: string | null; toPerson: string | null; remarks: string | null; }>;
}

type ActionType = "assign" | "transfer" | "repair" | "condition" | null;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionType>(null);
  const [depts, setDepts] = useState<Array<{ id: number; departmentName: string }>>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/assets/${id}`).then(r => r.json()).then((d: Asset) => { setAsset(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/departments?limit=100").then(r => r.json()).then((d: { data: typeof depts }) => setDepts(d.data));
  }, []);

  async function submitMovement(type: string, extraData: Record<string, unknown>) {
    if (!asset) return;
    setSaving(true);
    const res = await fetch("/api/assets/movements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: asset.id, movementType: type,
        movementDate: new Date().toISOString().slice(0, 10),
        fromDepartmentId: asset.departmentId,
        ...extraData,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Action recorded"); setAction(null); setFormData({}); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  if (loading) return <div className="p-6"><div className="h-32 bg-muted animate-pulse rounded-xl" /></div>;
  if (!asset) return <div className="p-6 text-center text-muted-foreground">Asset not found</div>;

  const condColor = { Excellent: "bg-green-100 text-green-700", Good: "bg-blue-100 text-blue-700", Fair: "bg-yellow-100 text-yellow-700", Poor: "bg-orange-100 text-orange-700", Damaged: "bg-red-100 text-red-700" }[asset.condition] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{asset.assetName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-muted-foreground text-sm">{asset.assetCode}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${condColor}`}>{asset.condition}</span>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{asset.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Asset Details</h2>
            {asset.assetPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.assetPhoto} alt={asset.assetName} className="w-48 h-48 object-cover rounded-xl border border-border shadow-sm mb-4" />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Category</p><p className="font-medium">{asset.assetCategory}</p></div>
              <div><p className="text-muted-foreground">Department</p><Link href={`/departments/${asset.departmentId}`} className="font-medium text-blue-600 hover:underline">{asset.departmentName}</Link></div>
              <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium">{asset.assignedToPersonName ?? "-"}</p></div>
              <div><p className="text-muted-foreground">Location</p><p className="font-medium text-xs">{asset.locationPath ?? "-"}</p></div>
              {asset.purchaseDate && <div><p className="text-muted-foreground">Purchase Date</p><p className="font-medium">{formatDate(asset.purchaseDate)}</p></div>}
              {asset.purchaseValue && <div><p className="text-muted-foreground">Purchase Value</p><p className="font-medium">{formatCurrency(asset.purchaseValue)}</p></div>}
              {asset.vendorName && <div><p className="text-muted-foreground">Vendor</p><p className="font-medium">{asset.vendorName}</p></div>}
              {asset.invoiceNumber && <div><p className="text-muted-foreground">Invoice No</p><p className="font-medium font-mono">{asset.invoiceNumber}</p></div>}
              {asset.warrantyEndDate && <div><p className="text-muted-foreground">Warranty Until</p><p className="font-medium">{formatDate(asset.warrantyEndDate)}</p></div>}
            </div>
            {asset.remarks && <div className="mt-4 pt-4 border-t border-border text-sm"><p className="text-muted-foreground">Remarks</p><p className="mt-1">{asset.remarks}</p></div>}
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Movement History</h2>
              <Link href="/assets/movements" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {asset.movements.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Details</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {asset.movements.map(m => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(m.movementDate)}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs font-medium">{m.movementType}</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.toPerson ?? m.toDepartmentName ?? m.remarks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No movements recorded</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4 text-sm">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { icon: User, label: "Assign Person", action: "assign" as ActionType, color: "text-blue-600" },
                { icon: ArrowLeftRight, label: "Transfer Department", action: "transfer" as ActionType, color: "text-indigo-600" },
                { icon: Wrench, label: "Send for Repair", action: "repair" as ActionType, color: "text-amber-600" },
                { icon: MapPin, label: "Update Condition", action: "condition" as ActionType, color: "text-emerald-600" },
              ].map(({ icon: Icon, label, action: a, color }) => (
                <button key={a} onClick={() => { setAction(a); setFormData({}); }}
                  className="w-full flex items-center gap-3 p-3 border border-input rounded-lg hover:bg-muted transition-colors text-sm font-medium">
                  <Icon className={`w-4 h-4 ${color}`} />{label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">
              {action === "assign" ? "Assign Person" : action === "transfer" ? "Transfer Department" : action === "repair" ? "Send for Repair" : "Update Condition"}
            </h2>
            {action === "assign" && (
              <div><label className="block text-sm font-medium mb-1">Assign To</label>
                <input value={formData.toPerson ?? ""} onChange={e => setFormData(f => ({ ...f, toPerson: e.target.value }))} placeholder="Person name" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            {action === "transfer" && (
              <div><label className="block text-sm font-medium mb-1">Transfer To Department</label>
                <select value={formData.toDepartmentId ?? ""} onChange={e => setFormData(f => ({ ...f, toDepartmentId: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                </select>
              </div>
            )}
            {action === "repair" && (
              <div><label className="block text-sm font-medium mb-1">Repair Notes</label>
                <textarea value={formData.remarks ?? ""} onChange={e => setFormData(f => ({ ...f, remarks: e.target.value }))} rows={3} placeholder="Describe the issue..." className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            )}
            {action === "condition" && (
              <div><label className="block text-sm font-medium mb-1">New Condition</label>
                <select value={formData.newCondition ?? asset.condition} onChange={e => setFormData(f => ({ ...f, newCondition: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {["Excellent","Good","Fair","Poor","Damaged"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAction(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button disabled={saving} onClick={() => {
                if (action === "assign") submitMovement("Assignment", { toPerson: formData.toPerson });
                else if (action === "transfer") submitMovement("Transfer", { toDepartmentId: formData.toDepartmentId ? parseInt(formData.toDepartmentId) : undefined });
                else if (action === "repair") submitMovement("Repair", { remarks: formData.remarks, newStatus: "Under Repair" });
                else if (action === "condition") submitMovement("Condition Update", { newCondition: formData.newCondition });
              }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
