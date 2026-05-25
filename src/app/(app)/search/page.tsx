"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Package, Box, Building2, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface SearchResults {
  items: Array<{ id: number; itemName: string; itemCode: string; category: string; currentStock: number; unit: string }>;
  assets: Array<{ id: number; assetName: string; assetCode: string; assetCategory: string; condition: string }>;
  departments: Array<{ id: number; departmentName: string; departmentCode: string }>;
  locations: Array<{ id: number; campusName: string; buildingName: string | null; roomName: string | null }>;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json()).then((d: SearchResults) => { setResults(d); setLoading(false); })
        .catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const total = results ? results.items.length + results.assets.length + results.departments.length + results.locations.length : 0;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Global Search</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items, assets, departments, locations..." autoFocus
          className="w-full pl-10 pr-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}</div>}

      {results && !loading && (
        <div className="space-y-4">
          {total === 0 && <p className="text-center text-muted-foreground py-8">No results for &quot;{query}&quot;</p>}

          {results.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inventory Items</p>
              <div className="space-y-1">
                {results.items.map(item => (
                  <Link key={item.id} href={`/inventory/items/${item.id}`} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow">
                    <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.itemCode} · {item.category}</p>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{item.currentStock} {item.unit}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.assets.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assets</p>
              <div className="space-y-1">
                {results.assets.map(asset => (
                  <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow">
                    <Box className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asset.assetName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{asset.assetCode} · {asset.assetCategory}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">{asset.condition}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.departments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Departments</p>
              <div className="space-y-1">
                {results.departments.map(d => (
                  <Link key={d.id} href={`/departments/${d.id}`} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow">
                    <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{d.departmentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.departmentCode}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.locations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Locations</p>
              <div className="space-y-1">
                {results.locations.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-lg">
                    <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm">{[l.campusName, l.buildingName, l.roomName].filter(Boolean).join(" › ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
