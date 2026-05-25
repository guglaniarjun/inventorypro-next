"use client";
import { useEffect, useState } from "react";
import { Building2, Users, Package, Box } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PlatformData {
  stats: { totalTenants: number; activeTenants: number; totalUsers: number; totalItems: number; totalAssets: number };
  tenants: Array<{ id: number; name: string; code: string; status: string; subscriptionPlan: string; createdAt: string; userCount: number; departmentCount: number }>;
}

export default function PlatformDashboardPage() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/platform").then(r => r.json()).then((d: PlatformData) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><div className="h-48 bg-muted animate-pulse rounded-xl" /></div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Access denied</div>;

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Platform Dashboard</h1><p className="text-sm text-muted-foreground">All tenants overview</p></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Tenants", value: data.stats.totalTenants, icon: Building2, color: "text-blue-600" },
          { label: "Active Tenants", value: data.stats.activeTenants, icon: Building2, color: "text-green-600" },
          { label: "Total Users", value: data.stats.totalUsers, icon: Users, color: "text-indigo-600" },
          { label: "Total Items", value: data.stats.totalItems, icon: Package, color: "text-violet-600" },
          { label: "Total Assets", value: data.stats.totalAssets, icon: Box, color: "text-cyan-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
            <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">All Schools / Tenants</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Plan</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Users</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Depts</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Created</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {data.tenants.map(t => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{t.code}</td>
                <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs capitalize">{t.subscriptionPlan}</span></td>
                <td className="px-4 py-3 text-right">{t.userCount}</td>
                <td className="px-4 py-3 text-right">{t.departmentCount}</td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{t.status}</span></td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
