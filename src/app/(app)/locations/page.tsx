"use client";
import { useEffect, useState } from "react";
import { Plus, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

interface Loc { id: number; campusName: string; buildingName: string | null; floorName: string | null; roomName: string | null; rackNo: string | null; shelfNo: string | null; status: string; locationPath: string; }

export default function LocationsPage() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ campusName: "", buildingName: "", floorName: "", roomName: "", rackNo: "", shelfNo: "", binNo: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/locations?search=${encodeURIComponent(search)}&limit=200`)
      .then(r => r.json())
      .then((d: { data: Loc[] }) => { setLocs(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/locations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, buildingName: form.buildingName || null, floorName: form.floorName || null, roomName: form.roomName || null, rackNo: form.rackNo || null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Location created"); setShowAdd(false); setForm({ campusName: "", buildingName: "", floorName: "", roomName: "", rackNo: "", shelfNo: "", binNo: "", description: "" }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Locations</h1><p className="text-sm text-muted-foreground">{locs.length} locations</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500"><Plus className="w-4 h-4" /> Add Location</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locs.map(l => (
            <div key={l.id} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{l.campusName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{[l.buildingName, l.floorName, l.roomName].filter(Boolean).join(" › ")}</p>
                  {(l.rackNo || l.shelfNo) && <p className="text-xs text-muted-foreground mt-0.5">{l.rackNo ? `Rack: ${l.rackNo}` : ""} {l.shelfNo ? `Shelf: ${l.shelfNo}` : ""}</p>}
                </div>
              </div>
            </div>
          ))}
          {locs.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No locations found</p>}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Add Location</h2>
            {[
              { label: "Campus Name *", key: "campusName", required: true },
              { label: "Building Name", key: "buildingName", required: false },
              { label: "Floor / Wing", key: "floorName", required: false },
              { label: "Room Name", key: "roomName", required: false },
              { label: "Rack No", key: "rackNo", required: false },
              { label: "Shelf No", key: "shelfNo", required: false },
            ].map(({ label, key, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
