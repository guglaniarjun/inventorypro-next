"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, List, Table2 } from "lucide-react";
import { toast } from "sonner";
import ImagePicker from "@/components/ImagePicker";

interface Dept { id: number; departmentName: string; }
interface Loc { id: number; locationPath: string; }

const CONDITIONS = ["Excellent","Good","Fair","Poor","Damaged"];
const STATUSES = ["In Use","In Storage","Under Repair","Disposed"];

interface BulkRow {
  id: string;
  quantity: string;
  condition: string;
  departmentId: string;
  locationId: string;
  status: string;
  assignedToPersonName: string;
  remarks: string;
}

let _rowCounter = 0;
function newRow(): BulkRow {
  return { id: `row-${Date.now()}-${++_rowCounter}`, quantity: "1", condition: "Good", departmentId: "", locationId: "", status: "In Use", assignedToPersonName: "", remarks: "" };
}

export default function NewAssetPage() {
  const router = useRouter();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [saving, setSaving] = useState(false);
  const [assetPhoto, setAssetPhoto] = useState("");
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single mode form
  const [form, setForm] = useState({
    assetName: "", assetCategory: "", departmentId: "", currentLocationId: "",
    assignedToPersonName: "", quantity: "1", purchaseDate: "", purchaseValue: "",
    vendorName: "", invoiceNumber: "", warrantyStartDate: "", warrantyEndDate: "",
    amcDetails: "", condition: "Good", status: "In Use", remarks: "",
  });

  // Bulk mode
  const [bulkHeader, setBulkHeader] = useState({
    assetName: "", assetCategory: "", purchaseDate: "", purchaseValue: "",
    vendorName: "", invoiceNumber: "", warrantyStartDate: "", warrantyEndDate: "", amcDetails: "",
  });
  const [rows, setRows] = useState<BulkRow[]>([newRow()]);

  useEffect(() => {
    fetch("/api/departments?limit=100").then(r => r.json()).then((d: {data: Dept[]}) => setDepts(d.data));
    fetch("/api/locations?limit=100").then(r => r.json()).then((d: {data: Loc[]}) => setLocations(d.data));
  }, []);

  const set = useCallback((k: string, v: string) => setForm(f => ({ ...f, [k]: v })), []);
  const setBH = useCallback((k: string, v: string) => setBulkHeader(f => ({ ...f, [k]: v })), []);

  function updateRow(id: string, k: keyof BulkRow, v: string) {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [k]: v } : r));
  }
  function addRow() { setRows(rs => [...rs, newRow()]); }
  function removeRow(id: string) { setRows(rs => rs.filter(r => r.id !== id)); }

  // Single submit
  async function handleSingle(e: React.FormEvent) {
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
        assetPhoto: assetPhoto || null,
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

  // Bulk submit
  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkHeader.assetName || !bulkHeader.assetCategory) { toast.error("Asset name and category are required"); return; }
    if (rows.some(r => !r.departmentId)) { toast.error("Every row needs a department"); return; }
    setSaving(true);
    let ok = 0; let fail = 0;
    for (const row of rows) {
      const res = await fetch("/api/assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetName: bulkHeader.assetName,
          assetCategory: bulkHeader.assetCategory,
          purchaseDate: bulkHeader.purchaseDate || null,
          purchaseValue: bulkHeader.purchaseValue ? parseFloat(bulkHeader.purchaseValue) : null,
          vendorName: bulkHeader.vendorName || null,
          invoiceNumber: bulkHeader.invoiceNumber || null,
          warrantyStartDate: bulkHeader.warrantyStartDate || null,
          warrantyEndDate: bulkHeader.warrantyEndDate || null,
          amcDetails: bulkHeader.amcDetails || null,
          assetPhoto: assetPhoto || null,
          quantity: parseInt(row.quantity) || 1,
          condition: row.condition,
          departmentId: parseInt(row.departmentId),
          currentLocationId: row.locationId ? parseInt(row.locationId) : null,
          status: row.status,
          assignedToPersonName: row.assignedToPersonName || null,
          remarks: row.remarks || null,
        }),
      });
      if (res.ok) ok++; else fail++;
    }
    setSaving(false);
    if (fail === 0) { toast.success(`${ok} asset record${ok !== 1 ? "s" : ""} created`); router.push("/assets"); }
    else toast.error(`${ok} created, ${fail} failed`);
  }

  const inputCls = "w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const cellInputCls = "w-full border border-input rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold flex-1">Add Asset</h1>
        {/* Mode toggle */}
        <div className="flex border border-input rounded-lg overflow-hidden text-sm">
          <button type="button" onClick={() => setMode("single")} className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === "single" ? "bg-blue-600 text-white" : "hover:bg-muted"}`}>
            <List className="w-3.5 h-3.5" /> Single
          </button>
          <button type="button" onClick={() => setMode("bulk")} className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === "bulk" ? "bg-blue-600 text-white" : "hover:bg-muted"}`}>
            <Table2 className="w-3.5 h-3.5" /> Bulk Entry
          </button>
        </div>
      </div>

      {/* ─── SINGLE MODE ─── */}
      {mode === "single" && (
        <form onSubmit={handleSingle} className="space-y-5">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Asset Name *</label><input value={form.assetName} onChange={e => set("assetName", e.target.value)} required className={inputCls} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Code</label>
                <input disabled placeholder="Auto-generated" className={`${inputCls} bg-muted/50 text-muted-foreground cursor-not-allowed`} />
                <p className="text-xs text-muted-foreground mt-1">Assigned automatically on save</p>
              </div>
              <div><label className="block text-sm font-medium mb-1">Category *</label><input value={form.assetCategory} onChange={e => set("assetCategory", e.target.value)} required className={inputCls} /></div>
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Department *</label>
                <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} required className={inputCls}>
                  <option value="">Select department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Condition</label>
                <select value={form.condition} onChange={e => set("condition", e.target.value)} className={inputCls}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" min={1} value={form.quantity} onChange={e => set("quantity", e.target.value)} className={inputCls} />
              </div>
              <div><label className="block text-sm font-medium mb-1">Assigned To</label>
                <input value={form.assignedToPersonName} onChange={e => set("assignedToPersonName", e.target.value)} placeholder="Person name" className={inputCls} />
              </div>
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Location</label>
                <select value={form.currentLocationId} onChange={e => set("currentLocationId", e.target.value)} className={inputCls}>
                  <option value="">No location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.locationPath}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Photo</h2>
            <ImagePicker value={assetPhoto} onChange={setAssetPhoto} label="Asset Photo" />
          </div>

          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Purchase Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Purchase Date</label><input type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Purchase Value (₹)</label><input type="number" min={0} step="0.01" value={form.purchaseValue} onChange={e => set("purchaseValue", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Vendor Name</label><input value={form.vendorName} onChange={e => set("vendorName", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Invoice Number</label><input value={form.invoiceNumber} onChange={e => set("invoiceNumber", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Warranty Start</label><input type="date" value={form.warrantyStartDate} onChange={e => set("warrantyStartDate", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Warranty End</label><input type="date" value={form.warrantyEndDate} onChange={e => set("warrantyEndDate", e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">AMC Details</label><textarea value={form.amcDetails} onChange={e => set("amcDetails", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
            <div><label className="block text-sm font-medium mb-1">Remarks</label><textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => router.back()} className="px-5 py-2 border border-input rounded-lg hover:bg-muted text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : "Create Asset"}</button>
          </div>
        </form>
      )}

      {/* ─── BULK MODE ─── */}
      {mode === "bulk" && (
        <form onSubmit={handleBulk} className="space-y-5">
          {/* Shared header */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Asset Details (shared for all rows)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Asset Name *</label><input value={bulkHeader.assetName} onChange={e => setBH("assetName", e.target.value)} required placeholder="e.g. Ceiling Fan, Chair, Table" className={inputCls} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Code</label>
                <input disabled placeholder="Auto-generated per record" className={`${inputCls} bg-muted/50 text-muted-foreground cursor-not-allowed`} />
              </div>
              <div><label className="block text-sm font-medium mb-1">Category *</label><input value={bulkHeader.assetCategory} onChange={e => setBH("assetCategory", e.target.value)} required placeholder="e.g. Furniture, Electronics" className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Purchase Date</label><input type="date" value={bulkHeader.purchaseDate} onChange={e => setBH("purchaseDate", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Purchase Value (₹)</label><input type="number" min={0} step="0.01" value={bulkHeader.purchaseValue} onChange={e => setBH("purchaseValue", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Vendor Name</label><input value={bulkHeader.vendorName} onChange={e => setBH("vendorName", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Invoice Number</label><input value={bulkHeader.invoiceNumber} onChange={e => setBH("invoiceNumber", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Warranty Start</label><input type="date" value={bulkHeader.warrantyStartDate} onChange={e => setBH("warrantyStartDate", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Warranty End</label><input type="date" value={bulkHeader.warrantyEndDate} onChange={e => setBH("warrantyEndDate", e.target.value)} className={inputCls} /></div>
            </div>
            <div className="pt-2">
              <ImagePicker value={assetPhoto} onChange={setAssetPhoto} label="Asset Photo (shared)" />
            </div>
          </div>

          {/* Row table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Distribution Rows</h2>
                <p className="text-xs text-muted-foreground">Each row creates one asset record. Use quantity to represent how many are in each group.</p>
              </div>
              <span className="text-xs text-muted-foreground">{rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0)} total units</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Qty *</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Condition</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-40">Department *</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-44">Location</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">Assigned To</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Remarks</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <input type="number" min={1} value={row.quantity} onChange={e => updateRow(row.id, "quantity", e.target.value)} required className={cellInputCls} />
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.condition} onChange={e => updateRow(row.id, "condition", e.target.value)} className={cellInputCls}>
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.departmentId} onChange={e => updateRow(row.id, "departmentId", e.target.value)} required className={cellInputCls}>
                          <option value="">Select dept *</option>
                          {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.locationId} onChange={e => updateRow(row.id, "locationId", e.target.value)} className={cellInputCls}>
                          <option value="">No location</option>
                          {locations.map(l => <option key={l.id} value={l.id}>{l.locationPath}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.status} onChange={e => updateRow(row.id, "status", e.target.value)} className={cellInputCls}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.assignedToPersonName} onChange={e => updateRow(row.id, "assignedToPersonName", e.target.value)} placeholder="Person name" className={cellInputCls} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={row.remarks} onChange={e => updateRow(row.id, "remarks", e.target.value)} placeholder="Optional notes" className={cellInputCls} />
                      </td>
                      <td className="px-3 py-2">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border">
              <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-500 text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => router.back()} className="px-5 py-2 border border-input rounded-lg hover:bg-muted text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-60">
              {saving ? `Creating ${rows.length} record${rows.length !== 1 ? "s" : ""}...` : `Create ${rows.length} Asset Record${rows.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
