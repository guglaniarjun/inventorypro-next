"use client";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Log { id: number; userName: string; actionType: string; module: string; description: string; timestamp: string; }

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (module) p.set("module", module);
    fetch(`/api/activity-logs?${p}`)
      .then(r => r.json())
      .then((d: { data: Log[]; total: number }) => { setLogs(d.data); setTotal(d.total); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [module, page]);

  const MODULES = ["Auth","Inventory","Assets","Departments","Users","Approvals"];
  const actionColor = (a: string) => ({ LOGIN: "bg-green-100 text-green-700", LOGOUT: "bg-gray-100 text-gray-600", CREATE: "bg-blue-100 text-blue-700", UPDATE: "bg-amber-100 text-amber-700", DELETE: "bg-red-100 text-red-700", TRANSACTION: "bg-indigo-100 text-indigo-700", MOVEMENT: "bg-purple-100 text-purple-700" }[a] ?? "bg-secondary text-secondary-foreground");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Activity Logs</h1><p className="text-sm text-muted-foreground">{total} total records</p></div>
        <select value={module} onChange={e => { setModule(e.target.value); setPage(1); }} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {loading ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="p-4"><div className="h-8 bg-muted animate-pulse rounded" /></div>)
          : logs.map(log => (
          <div key={log.id} className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{log.userName}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(log.actionType)}`}>{log.actionType}</span>
                <span className="text-xs text-muted-foreground">{log.module}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{log.description}</p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(log.timestamp)}</span>
          </div>
        ))}
        {!loading && logs.length === 0 && <div className="text-center text-muted-foreground py-12">No activity logs found</div>}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-muted disabled:opacity-50">Previous</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-muted disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
