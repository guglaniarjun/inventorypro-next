"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Movement {
  id: number; assetName: string; assetCode: string; movementType: string;
  fromDepartmentName: string | null; toDepartmentName: string | null;
  fromPerson: string | null; toPerson: string | null;
  movementDate: string; approvalStatus: string; remarks: string | null;
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movType, setMovType] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (movType) p.set("type", movType);
    fetch(`/api/assets/movements?${p}`)
      .then((r) => r.json())
      .then((d: { data: Movement[]; total: number }) => { setMovements(d.data); setTotal(d.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [movType, page]);

  useEffect(() => { load(); }, [load]);

  const TYPES = ["Assignment", "Transfer", "Repair", "Return", "Disposal", "Condition Update"];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Asset Movements</h1><p className="text-sm text-muted-foreground">{total} records</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setMovType(""); setPage(1); }} className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${!movType ? "bg-blue-600 text-white border-blue-600" : "border-input hover:bg-muted"}`}>All</button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => { setMovType(t); setPage(1); }} className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${movType === t ? "bg-blue-600 text-white border-blue-600" : "border-input hover:bg-muted"}`}>{t}</button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Movement</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                : movements.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.assetName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.assetCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-medium">{m.movementType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.fromPerson ?? m.fromDepartmentName ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.toPerson ?? m.toDepartmentName ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.approvalStatus === "Approved" ? "bg-green-100 text-green-700" : m.approvalStatus === "Pending" ? "bg-amber-100 text-amber-700" : "bg-secondary text-secondary-foreground"}`}>
                          {m.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(m.movementDate)}</td>
                    </tr>
                  ))
              }
              {!loading && movements.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-12">No movements found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-muted disabled:opacity-50">Previous</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-muted disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
