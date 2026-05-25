"use client";
import { useEffect, useState } from "react";
import { BarChart3, FileDown, AlertTriangle, Box, Package } from "lucide-react";

interface InventoryReport { data: Array<{ id: number; itemName: string; itemCode: string; category: string; departmentName: string; currentStock: number; unit: string; minimumStockLevel: number; isLowStock: boolean; }>; summary: { totalItems: number; lowStockCount: number; outOfStockCount: number }; }
interface AssetReport { data: Array<{ id: number; assetName: string; assetCode: string; assetCategory: string; departmentName: string; condition: string; status: string; purchaseValue: string | null; }>; summary: { totalAssets: number; totalValue: number; damagedCount: number; underRepairCount: number }; }

type ReportType = "inventory" | "assets" | "low-stock";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("inventory");
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [assetData, setAssetData] = useState<AssetReport | null>(null);
  const [lowStockData, setLowStockData] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = reportType === "inventory" ? "/api/reports/inventory" : reportType === "assets" ? "/api/reports/assets" : "/api/reports/low-stock";
    fetch(url).then(r => r.json()).then((d: InventoryReport | AssetReport) => {
      if (reportType === "inventory") setInventoryData(d as InventoryReport);
      else if (reportType === "assets") setAssetData(d as AssetReport);
      else setLowStockData(d as InventoryReport);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reportType]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-muted-foreground">Generate and export reports</p></div>
      </div>

      <div className="flex gap-2">
        {[
          { key: "inventory" as ReportType, label: "Inventory Report", icon: Package },
          { key: "assets" as ReportType, label: "Asset Register", icon: Box },
          { key: "low-stock" as ReportType, label: "Low Stock Alert", icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setReportType(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportType === key ? "bg-blue-600 text-white" : "border border-input hover:bg-muted"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {!loading && reportType === "inventory" && inventoryData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-blue-600">{inventoryData.summary.totalItems}</p><p className="text-sm text-muted-foreground">Total Items</p></div>
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-600">{inventoryData.summary.lowStockCount}</p><p className="text-sm text-muted-foreground">Low Stock</p></div>
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-600">{inventoryData.summary.outOfStockCount}</p><p className="text-sm text-muted-foreground">Out of Stock</p></div>
        </div>
      )}
      {!loading && reportType === "assets" && assetData && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-blue-600">{assetData.summary.totalAssets}</p><p className="text-sm text-muted-foreground">Total Assets</p></div>
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-emerald-600">₹{assetData.summary.totalValue.toLocaleString("en-IN")}</p><p className="text-sm text-muted-foreground">Total Value</p></div>
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-600">{assetData.summary.damagedCount}</p><p className="text-sm text-muted-foreground">Damaged</p></div>
          <div className="bg-white border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-amber-600">{assetData.summary.underRepairCount}</p><p className="text-sm text-muted-foreground">Under Repair</p></div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {reportType !== "assets" ? (
              <>
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Min Level</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {loading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                    : (reportType === "inventory" ? inventoryData?.data : lowStockData?.data)?.map(item => (
                    <tr key={item.id} className={`hover:bg-muted/30 ${item.isLowStock ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-3"><p className="font-medium">{item.itemName}</p><p className="text-xs font-mono text-muted-foreground">{item.itemCode}</p></td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.departmentName}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{item.currentStock} {item.unit}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{item.minimumStockLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Condition</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {loading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                    : assetData?.data.map(a => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3"><p className="font-medium">{a.assetName}</p><p className="text-xs font-mono text-muted-foreground">{a.assetCode}</p></td>
                      <td className="px-4 py-3 text-muted-foreground">{a.assetCategory}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.departmentName}</td>
                      <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{a.condition}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{a.purchaseValue ? `₹${parseFloat(a.purchaseValue).toLocaleString("en-IN")}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
