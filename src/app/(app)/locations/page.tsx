"use client";
import { useEffect, useState } from "react";
import { Plus, MapPin, Search, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Loc {
  id: number; campusName: string; buildingName: string | null; floorName: string | null;
  roomName: string | null; rackNo: string | null; shelfNo: string | null; status: string; locationPath: string;
}

type LocForm = { campusName: string; buildingName: string; floorName: string; roomName: string; rackNo: string; shelfNo: string; binNo: string; description: string; };
const EMPTY_FORM: LocForm = { campusName: "", buildingName: "", floorName: "", roomName: "", rackNo: "", shelfNo: "", binNo: "", description: "" };
const LOC_FIELDS: { label: string; key: keyof LocForm; required: boolean }[] = [
  { label: "Campus Name *", key: "campusName", required: true },
  { label: "Building Name", key: "buildingName", required: false },
  { label: "Floor / Wing", key: "floorName", required: false },
  { label: "Room Name", key: "roomName", required: false },
  { label: "Rack No", key: "rackNo", required: false },
  { label: "Shelf No", key: "shelfNo", required: false },
];

function LocModal({ title, data, setData, onSubmit, onClose, saving }: {
  title: string; data: LocForm; setData: (f: LocForm) => void;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>
        {LOC_FIELDS.map(({ label, key, required }) => (
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

export default function LocationsPage() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<LocForm>({ ...EMPTY_FORM });

  const [editLoc, setEditLoc] = useState<Loc | null>(null);
  const [editForm, setEditForm] = useState<LocForm>({ ...EMPTY_FORM });

  const [confirmDel, setConfirmDel] = useState<Loc | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json())
      .then((u: { role?: string }) => setIsAdmin(["admin", "tenant_super_admin", "platform_super_admin"].includes(u?.role ?? "")))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    fetch(`/api/locations?search=${encodeURIComponent(search)}&limit=200`)
      .then(r => r.json())
      .then((d: { data?: Loc[] }) => { setLocs(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch("/api/locations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, buildingName: addForm.buildingName || null, floorName: addForm.floorName || null, roomName: addForm.roomName || null, rackNo: addForm.rackNo || null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Location created"); setShowAdd(false); setAddForm({ ...EMPTY_FORM }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  function openEdit(l: Loc) {
    setEditLoc(l);
    setEditForm({ campusName: l.campusName, buildingName: l.buildingName ?? "", floorName: l.floorName ?? "", roomName: l.roomName ?? "", rackNo: l.rackNo ?? "", shelfNo: l.shelfNo ?? "", binNo: "", description: "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editLoc) return; setSaving(true);
    const res = await fetch(`/api/locations/${editLoc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campusName: editForm.campusName, buildingName: editForm.buildingName || null, floorName: editForm.floorName || null, roomName: editForm.roomName || null, rackNo: editForm.rackNo || null, shelfNo: editForm.shelfNo || null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Location updated"); setEditLoc(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  async function handleDelete() {
    if (!confirmDel) return; setSaving(true);
    const res = await fetch(`/api/locations/${confirmDel.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { toast.success("Location deleted"); setConfirmDel(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Locations</h1><p className="text-sm text-muted-foreground">{locs.length} locations</p></div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
            <Plus className="w-4 h-4" /> Add Location
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..."
          className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locs.map(l => (
            <div key={l.id} className="bg-white border border-border rounded-xl p-4 group relative">
              <div className="flex items-start gap-3 pr-14">
                <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{l.campusName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{[l.buildingName, l.floorName, l.roomName].filter(Boolean).join(" › ")}</p>
                  {(l.rackNo || l.shelfNo) && <p className="text-xs text-muted-foreground mt-0.5">{l.rackNo ? `Rack: ${l.rackNo}` : ""} {l.shelfNo ? `Shelf: ${l.shelfNo}` : ""}</p>}
                </div>
              </div>
              {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(l)} title="Edit"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDel(l)} title="Delete"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {locs.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No locations found</p>}
        </div>
      )}

      {showAdd && <LocModal title="Add Location" data={addForm} setData={setAddForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} saving={saving} />}
      {editLoc && <LocModal title={`Edit: ${editLoc.campusName}`} data={editForm} setData={setEditForm} onSubmit={handleEdit} onClose={() => setEditLoc(null)} saving={saving} />}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete Location?</h2>
            <p className="text-sm text-muted-foreground">Delete <strong>{confirmDel.locationPath}</strong>? This cannot be undone.</p>
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
