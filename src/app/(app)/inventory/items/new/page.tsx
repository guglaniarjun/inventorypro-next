"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import ImagePicker from "@/components/ImagePicker";

interface Dept { id: number; departmentName: string; }
interface Loc { id: number; campusName: string; buildingName: string | null; roomName: string | null; locationPath: string; }

export default function NewItemPage() {
  const router = useRouter();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [saving, setSaving] = useState(false);
  const [itemPhoto, setItemPhoto] = useState("");
  const [form, setForm] = useState({
    itemName: "", itemCode: "", category: "", itemType: "Consumable", description: "",
    usedFor: "", unit: "Nos", openingStock: "0", minimumStockLevel: "0", reorderLevel: "0",
    departmentId: "", locationId: "", rackNo: "", shelfNo: "", remarks: "",
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
    const res = await fetch("/api/inventory/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        openingStock: parseInt(form.openingStock) || 0,
        minimumStockLevel: parseInt(form.minimumStockLevel) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        departmentId: parseInt(form.departmentId),
        locationId: form.locationId ? parseInt(form.locationId) : null,
        rackNo: form.rackNo || null, shelfNo: form.shelfNo || null,
        description: form.description || null, usedFor: form.usedFor || null, remarks: form.remarks || null,
        itemPhoto: itemPhoto || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const item = await res.json() as { id: number };
      toast.success("Item created");
      router.push(`/inventory/items/${item.id}`);
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold">Add Inventory Item</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Item Name *</label>
              <input value={form.itemName} onChange={e => set("itemName", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item Code</label>
              <input disabled placeholder="Auto-generated" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Assigned automatically on save</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <input value={form.category} onChange={e => set("category", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item Type</label>
              <select value={form.itemType} onChange={e => set("itemType", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {["Consumable","Non-Consumable","Equipment","Furniture","Stationery"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {["Nos","Kg","Litre","Box","Pack","Set","Pair","Roll","Sheet","Bottle"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Department *</label>
              <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stock Levels</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Opening Stock", key: "openingStock" },
              { label: "Min Stock Level", key: "minimumStockLevel" },
              { label: "Reorder Level", key: "reorderLevel" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type="number" min={0} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Location</label>
              <select value={form.locationId} onChange={e => set("locationId", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.locationPath}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Rack No</label><input value={form.rackNo} onChange={e => set("rackNo", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Shelf No</label><input value={form.shelfNo} onChange={e => set("shelfNo", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Photo</h2>
          <ImagePicker value={itemPhoto} onChange={setItemPhoto} label="Item Photo" />
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Additional Info</h2>
          {[
            { label: "Used For", key: "usedFor", rows: 1 },
            { label: "Description", key: "description", rows: 2 },
            { label: "Remarks", key: "remarks", rows: 2 },
          ].map(({ label, key, rows }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <textarea value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} rows={rows}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-5 py-2 border border-input rounded-lg hover:bg-muted text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : "Create Item"}</button>
        </div>
      </form>
    </div>
  );
}
