"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Approval { id: number; module: string; description: string; status: string; requestedAt: string; remarks: string | null; }

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [processing, setProcessing] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/approvals?status=${statusFilter}&limit=100`)
      .then(r => r.json())
      .then((d: { data: Approval[] }) => { setApprovals(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  async function handle(id: number, status: "Approved" | "Rejected") {
    setProcessing(id);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setProcessing(null);
    if (res.ok) { toast.success(`${status}`); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Approvals</h1><p className="text-sm text-muted-foreground">{approvals.length} records</p></div>
        <div className="flex gap-2">
          {["Pending","Approved","Rejected","all"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "border border-input hover:bg-muted"}`}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><div className="h-12 bg-muted animate-pulse rounded" /></div>)
          : approvals.map(a => (
          <div key={a.id} className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-full ${a.status === "Pending" ? "bg-amber-100" : a.status === "Approved" ? "bg-green-100" : "bg-red-100"}`}>
                {a.status === "Pending" ? <Clock className="w-4 h-4 text-amber-600" /> : a.status === "Approved" ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              </div>
              <div>
                <p className="font-medium text-sm">{a.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.module} · {formatDate(a.requestedAt)}</p>
                {a.remarks && <p className="text-xs text-muted-foreground mt-0.5">{a.remarks}</p>}
              </div>
            </div>
            {a.status === "Pending" && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handle(a.id, "Approved")} disabled={processing === a.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-60"><CheckCircle className="w-3 h-3" /> Approve</button>
                <button onClick={() => handle(a.id, "Rejected")} disabled={processing === a.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-60"><XCircle className="w-3 h-3" /> Reject</button>
              </div>
            )}
          </div>
        ))}
        {!loading && approvals.length === 0 && <div className="text-center text-muted-foreground py-12">No approvals found</div>}
      </div>
    </div>
  );
}
