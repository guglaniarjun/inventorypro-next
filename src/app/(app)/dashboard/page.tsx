"use client";
import { useEffect, useState } from "react";
import { Package, Box, Building2, Users, AlertTriangle, Wrench, Clock, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalDepartments: number; totalItems: number; totalAssets: number;
    totalUsers: number; lowStockItems: number; damagedAssets: number;
    underRepairAssets: number; pendingApprovals: number;
  };
  recentTransactions: Array<{ id: number; itemName: string; departmentName: string; transactionType: string; quantity: number; createdAt: string }>;
  inventoryByDept: Array<{ name: string; value: number }>;
  assetsByDept: Array<{ name: string; value: number }>;
}

const COLORS = ["#3b82f6","#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];

function StatCard({ label, value, icon: Icon, href, color }: { label: string; value: number; icon: React.ElementType; href?: string; color: string }) {
  const content = (
    <div className={`bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-muted`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then((r) => r.json())
      .then((d: DashboardData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
      ))}
    </div>
  );

  if (!data) return <div className="p-6 text-center text-muted-foreground">Failed to load dashboard</div>;

  const { stats } = data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Inventory & Asset Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Departments" value={stats.totalDepartments} icon={Building2} href="/departments" color="text-blue-600" />
        <StatCard label="Inventory Items" value={stats.totalItems} icon={Package} href="/inventory/items" color="text-indigo-600" />
        <StatCard label="Assets" value={stats.totalAssets} icon={Box} href="/assets" color="text-violet-600" />
        <StatCard label="Active Users" value={stats.totalUsers} icon={Users} href="/users" color="text-cyan-600" />
        <StatCard label="Low Stock" value={stats.lowStockItems} icon={AlertTriangle} href="/reports" color="text-amber-600" />
        <StatCard label="Damaged Assets" value={stats.damagedAssets} icon={AlertTriangle} color="text-red-600" />
        <StatCard label="Under Repair" value={stats.underRepairAssets} icon={Wrench} color="text-orange-600" />
        <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon={CheckSquare} href="/approvals" color="text-emerald-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm">Inventory by Department</h2>
          {data.inventoryByDept.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.inventoryByDept} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.inventoryByDept.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">No data</p>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm">Assets by Department</h2>
          {data.assetsByDept.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.assetsByDept} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.assetsByDept.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">No data</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Recent Transactions</h2>
          <Link href="/inventory/transactions" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        {data.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Department</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{tx.itemName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{tx.departmentName}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${tx.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground text-xs">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
