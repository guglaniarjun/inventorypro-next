"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Box, AlertTriangle } from "lucide-react";

interface Asset {
  id: number; assetName: string; assetCode: string; assetCategory: string;
  condition: string; status: string; departmentName: string;
  assignedToPersonName: string | null; purchaseValue: string | null;
}

const CONDITIONS = ["Excellent","Good","Fair","Poor","Damaged"];
const STATUSES = ["In Use","In Storage","Under Repair","Disposed","Discarded"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetch("/api/assets/categories").then(r => r.json()).then((c: string[]) => setCategories(c));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "100" });
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

  const conditionColor = (c: string) => ({
    Excellent: "bg-green-100 text-green-700", Good: "bg-blue-100 text-blue-700",
    Fair: "bg-yellow-100 text-yellow-700", Poor: "bg-orange-100 text-orange-700",
    Damaged: "bg-red-100 text-red-700",
  }[c] ?? "bg-gray-100 text-gray-700");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Assets</h1><p className="text-sm text-muted-foreground">{total} assets</p></div>
        <Link href="/assets/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
          <Plus className="w-4 h-4" /> Add Asset
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned To</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Condition</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                : assets.map(a => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/assets/${a.id}`} className="hover:text-blue-600">
                          <p className="font-medium">{a.assetName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{a.assetCode}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.assetCategory}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.departmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{a.assignedToPersonName ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor(a.condition)}`}>{a.condition}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{a.status}</span>
                      </td>
                    </tr>
                  ))
              }
              {!loading && assets.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-12">No assets found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
