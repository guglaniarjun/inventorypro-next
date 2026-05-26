"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, List, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Asset {
  id: number; assetName: string; assetCode: string; assetCategory: string;
  condition: string; status: string; departmentName: string;
  assignedToPersonName: string | null; purchaseValue: string | null;
  locationPath: string | null;
}

interface LocationRow { category: string; totalQuantity: number; count: number; conditions: Record<string, number>; }
interface LocationGroup { locationPath: string; locationId: number | null; rows: LocationRow[]; totalAssets: number; }

const CONDITIONS = ["Excellent","Good","Fair","Poor","Damaged"];
const STATUSES = ["In Use","In Storage","Under Repair","Disposed","Discarded"];

const conditionColor = (c: string) => ({
  Excellent: "bg-green-100 text-green-700", Good: "bg-blue-100 text-blue-700",
  Fair: "bg-yellow-100 text-yellow-700", Poor: "bg-orange-100 text-orange-700",
  Damaged: "bg-red-100 text-red-700",
}[c] ?? "bg-gray-100 text-gray-700");

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [view, setView] = useState<"list" | "location">("list");
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [locationData, setLocationData] = useState<LocationGroup[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locCategory, setLocCategory] = useState("");

  useEffect(() => {
    fetch("/api/assets/categories")
      .then(r => r.json())
      .then((c: unknown) => { if (Array.isArray(c)) setCategories(c as string[]); })
      .catch(() => {});
    fetch("/api/auth/me").then(r => r.json())
      .then((u: { role?: string }) => setIsAdmin(["admin", "tenant_super_admin", "platform_super_admin"].includes(u?.role ?? "")))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "200" });
    if (search) p.set("search", search);
    if (category) p.set("category", category);
    if (condition) p.set("condition", condition);
    if (status) p.set("status", status);
    fetch(`/api/assets?${p}`)
      .then(r => r.json())
      .then((d: { data: Asset[]; total: number }) => { setAssets(d.data); setTotal(d.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, category, condition, status]);

  useEffect(() => { load(); }, [load]);

  const loadLocationView = useCallback(() => {
    setLocationLoading(true);
    const p = new URLSearchParams();
    if (locCategory) p.set("category", locCategory);
    fetch(`/api/assets/by-location?${p}`)
      .then(r => r.json())
      .then((d: LocationGroup[]) => { setLocationData(d); setLocationLoading(false); })
      .catch(() => setLocationLoading(false));
  }, [locCategory]);

  useEffect(() => {
    if (view === "location") loadLocationView();
  }, [view, loadLocationView]);

  async function handleDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await fetch(`/api/assets/${confirmDel.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) { toast.success("Asset discarded"); setConfirmDel(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  const colSpan = isAdmin ? 8 : 7;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Assets</h1><p className="text-sm text-muted-foreground">{total} assets</p></div>
        <div className="flex items-center gap-3">
          <div className="flex border border-input rounded-lg overflow-hidden text-sm">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === "list" ? "bg-blue-600 text-white" : "hover:bg-muted"}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView("location")} className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === "location" ? "bg-blue-600 text-white" : "hover:bg-muted"}`}>
              <MapPin className="w-3.5 h-3.5" /> By Location
            </button>
          </div>
          {isAdmin && (
            <Link href="/assets/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
              <Plus className="w-4 h-4" /> Add Asset
            </Link>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
                className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={condition} onChange={e => setCondition(e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Conditions</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned To</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Condition</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={colSpan} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                    : assets.map(a => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <Link href={`/assets/${a.id}`} className="hover:text-blue-600">
                              <p className="font-medium">{a.assetName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{a.assetCode}</p>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{a.assetCategory}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.departmentName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.locationPath ?? "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{a.assignedToPersonName ?? "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor(a.condition)}`}>{a.condition}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{a.status}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={`/assets/${a.id}`} title="Edit"
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Link>
                                <button onClick={() => setConfirmDel(a)} title="Discard"
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                  }
                  {!loading && assets.length === 0 && <tr><td colSpan={colSpan} className="text-center text-muted-foreground py-12">No assets found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* BY LOCATION VIEW */}
      {view === "location" && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Filter by category:</span>
            </div>
            <select value={locCategory} onChange={e => setLocCategory(e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">{locationData.length} location{locationData.length !== 1 ? "s" : ""}</span>
          </div>

          {locationLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : locationData.length === 0 ? (
            <div className="bg-white border border-border rounded-xl py-16 text-center text-muted-foreground text-sm">
              No assets found for the selected filter
            </div>
          ) : (
            <div className="space-y-3">
              {locationData.map((loc) => (
                <div key={loc.locationPath} className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm">{loc.locationPath}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{loc.totalAssets} total</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10">
                      <tr>
                        <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                        <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Records</th>
                        <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Condition Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loc.rows.map(row => (
                        <tr key={row.category} className="hover:bg-muted/20">
                          <td className="px-5 py-2.5 font-medium">{row.category}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-bold text-blue-600">{row.totalQuantity}</td>
                          <td className="px-5 py-2.5 text-right text-muted-foreground font-mono">{row.count}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(row.conditions).map(([cond, qty]) => (
                                <span key={cond} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor(cond)}`}>
                                  {cond}: {qty}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Discard Asset?</h2>
            <p className="text-sm text-muted-foreground">Mark <strong>{confirmDel.assetName}</strong> as Discarded? You can still find it in the list with a Discarded status.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-60">{deleting ? "Discarding..." : "Discard"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
