"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Package, Box } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DeptDetail {
  id: number; departmentName: string; departmentCode: string;
  inchargeName: string | null; location: string | null; phone: string | null;
  itemCount: number; assetCount: number;
  recentItems: Array<{ id: number; itemName: string; itemCode: string; category: string; currentStock: number; unit: string; status: string }>;
  recentAssets: Array<{ id: number; assetName: string; assetCode: string; assetCategory: string; condition: string; status: string }>;
  users: Array<{ id: number; fullName: string; role: string; email: string }>;
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dept, setDept] = useState<DeptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/departments/${id}`)
      .then((r) => r.json())
      .then((d: DeptDetail) => { setDept(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6"><div className="h-32 bg-muted animate-pulse rounded-xl" /></div>;
  if (!dept) return <div className="p-6 text-center text-muted-foreground">Department not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 border border-input rounded-lg hover:bg-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{dept.departmentName}</h1>
          <p className="text-muted-foreground text-sm font-mono">{dept.departmentCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground font-medium">In-charge</p>
          <p className="font-semibold mt-1">{dept.inchargeName ?? "-"}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5 flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm text-muted-foreground">Inventory Items</p>
            <p className="text-2xl font-bold text-blue-600">{dept.itemCount}</p>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-5 flex items-center gap-3">
          <Box className="w-8 h-8 text-indigo-600" />
          <div>
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="text-2xl font-bold text-indigo-600">{dept.assetCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Inventory Items</h2>
            <Link href={`/inventory/items?departmentId=${id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {dept.recentItems.map((item) => (
              <Link key={item.id} href={`/inventory/items/${item.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm">
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">{item.itemCode} · {item.category}</p>
                </div>
                <span className="font-mono text-sm">{item.currentStock} {item.unit}</span>
              </Link>
            ))}
            {dept.recentItems.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No items</p>}
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Assets</h2>
            <Link href={`/assets?departmentId=${id}`} className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {dept.recentAssets.map((asset) => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm">
                <div>
                  <p className="font-medium">{asset.assetName}</p>
                  <p className="text-xs text-muted-foreground">{asset.assetCode} · {asset.assetCategory}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  asset.condition === "Good" ? "bg-green-100 text-green-700" :
                  asset.condition === "Damaged" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>{asset.condition}</span>
              </Link>
            ))}
            {dept.recentAssets.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No assets</p>}
          </div>
        </div>
      </div>

      {dept.users.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Staff Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dept.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {u.fullName[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.role.replace(/_/g, " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
