"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: number; itemName: string; itemCode: string; category: string; itemType: string;
  currentStock: number; unit: string; status: string; departmentName: string;
  minimumStockLevel: number; isLowStock: boolean;
}

interface Filters { search: string; category: string; status: string; departmentId: string; }

export default function InventoryItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ search: "", category: "", status: "", departmentId: "" });
  const [categories, setCategories] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json())
      .then((u: { role?: string }) => {
        const role = u?.role ?? "";
        setIsAdmin(["admin", "tenant_super_admin", "platform_super_admin"].includes(role));
        setCanAdd(role !== "auditor" && role !== "");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "100" });
    if (filters.search) p.set("search", filters.search);
    if (filters.category) p.set("category", filters.category);
    if (filters.status) p.set("status", filters.status);
    if (filters.departmentId) p.set("departmentId", filters.departmentId);
    fetch(`/api/inventory/items?${p}`)
      .then(r => r.json())
      .then((d: { data: Item[]; total: number; categories?: string[] }) => {
        setItems(d.data);
        setTotal(d.total);
        if (d.categories?.length) setCategories(d.categories);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(key: keyof Filters, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  async function handleDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await fetch(`/api/inventory/items/${confirmDel.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) { toast.success("Item deleted"); setConfirmDel(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed to delete"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Items</h1>
          <p className="text-sm text-muted-foreground">{total} items</p>
        </div>
        {canAdd && (
          <Link href="/inventory/items/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
            <Plus className="w-4 h-4" /> Add Item
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={filters.search} onChange={e => setFilter("search", e.target.value)} placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filters.category} onChange={e => setFilter("category", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter("status", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={isAdmin ? 6 : 5} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>
                  ))
                : items.map(item => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/inventory/items/${item.id}`} className="hover:text-blue-600">
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.departmentName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-semibold ${item.isLowStock ? "text-amber-600" : ""}`}>
                          {item.currentStock} {item.unit}
                        </span>
                        {item.isLowStock && <AlertTriangle className="inline w-3 h-3 text-amber-500 ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "Active" ? "bg-green-100 text-green-700" :
                          item.status === "Low Stock" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>{item.status}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/inventory/items/${item.id}`} title="Edit"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => setConfirmDel(item)} title="Delete"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              }
              {!loading && items.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-12">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete Item?</h2>
            <p className="text-sm text-muted-foreground">Delete <strong>{confirmDel.itemName}</strong> and all its stock history? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
