"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

interface Dept { id: number; departmentName: string; }
interface Loc { id: number; locationPath: string; }

export default function NewAssetPage() {
  const router = useRouter();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetName: "", assetCode: "", assetCategory: "", departmentId: "", currentLocationId: "",
    assignedToPersonName: "", quantity: "1", purchaseDate: "", purchaseValue: "",
    vendorName: "", invoiceNumber: "", warrantyStartDate: "", warrantyEndDate: "",
    amcDetails: "", condition: "Good", status: "In Use", remarks: "",
  });

  useEffect(() => {
    fetch("/api/departments?limit=100").then(r => r.json()).then((d: {data: Dept[]}) => setDepts(d.data));
    fetch("/api/locations?limit=100").then(r => r.json()).then((d: {data: Loc[]}) => setLocations(d.data));
  }, []);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.departmentId) { toast.error("Select a department"); return; }
    setSaving(true);
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        departmentId: parseInt(form.departmentId),
        currentLocationId: form.currentLocationId ? parseInt(form.currentLocationId) : null,
        purchaseDate: form.purchaseDate || null,
        purchaseValue: form.purchaseValue ? parseFloat(form.purchaseValue) : null,
        warrantyStartDate: form.warrantyStartDate || null,
        warrantyEndDate: form.warrantyEndDate || null,
        assignedToPersonName: form.assignedToPersonName || null,
        vendorName: form.vendorName || null,
        invoiceNumber: form.invoiceNumber || null,
        amcDetails: form.amcDetails || null,
        remarks: form.remarks || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const asset = await res.json() as { id: number };
      toast.success("Asset created");
      router.push(`/assets/${asset.id}`);
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold">Add Asset</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Asset Name *</label><input value={form.assetName} onChange={e => set("assetName", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Asset Code</label><input value={form.assetCode} onChange={e => set("assetCode", e.target.value)} placeholder="Auto-generated if blank" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Category *</label><input value={form.assetCategory} onChange={e => set("assetCategory", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Department *</label>
              <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Condition</label>
              <select value={form.condition} onChange={e => set("condition", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {["Excellent","Good","Fair","Poor","Damaged"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {["In Use","In Storage","Under Repair","Disposed"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Assigned To</label><input value={form.assignedToPersonName} onChange={e => set("assignedToPersonName", e.target.value)} placeholder="Person name" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Location</label>
              <select value={form.currentLocationId} onChange={e => set("currentLocationId", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.locationPath}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Purchase Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Purchase Date</label><input type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Purchase Value (₹)</label><input type="number" min={0} step="0.01" value={form.purchaseValue} onChange={e => set("purchaseValue", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Vendor Name</label><input value={form.vendorName} onChange={e => set("vendorName", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Invoice Number</label><input value={form.invoiceNumber} onChange={e => set("invoiceNumber", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Warranty Start</label><input type="date" value={form.warrantyStartDate} onChange={e => set("warrantyStartDate", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Warranty End</label><input type="date" value={form.warrantyEndDate} onChange={e => set("warrantyEndDate", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">AMC Details</label><textarea value={form.amcDetails} onChange={e => set("amcDetails", e.target.value)} rows={2} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Remarks</label><textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} rows={2} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-5 py-2 border border-input rounded-lg hover:bg-muted text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : "Create Asset"}</button>
        </div>
      </form>
    </div>
  );
}
