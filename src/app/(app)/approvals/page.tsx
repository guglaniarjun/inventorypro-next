"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Approval {
  id: number; module: string; description: string; status: string;
  requestedAt: string; remarks: string | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/approvals?status=${statusFilter}&limit=100`)
      .then(r => r.json())
      .then((d: { data: Approval[] }) => { setApprovals(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  async function approve(id: number) {
    setProcessing(id);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Approved" }),
    });
    setProcessing(null);
    if (res.ok) { toast.success("Approved — transaction executed"); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  async function reject(id: number) {
    setProcessing(id);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Rejected", remarks: rejectRemarks }),
    });
    setProcessing(null);
    if (res.ok) { toast.success("Rejected"); setRejectId(null); setRejectRemarks(""); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  const moduleIcon = (mod: string) => {
    if (mod.startsWith("Inventory")) return <Package className="w-4 h-4 text-blue-600" />;
    if (mod.startsWith("Asset")) return <Layers className="w-4 h-4 text-indigo-600" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const moduleLabel = (mod: string) => {
    if (mod === "Inventory-Transaction") return "Inventory";
    if (mod === "Asset-Movement") return "Assets";
    return mod;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve pending inventory and asset requests
          </p>
        </div>
        <div className="flex gap-2">
          {["Pending", "Approved", "Rejected", "all"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "border border-input hover:bg-muted"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {statusFilter === "Pending" && approvals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>{approvals.length} request{approvals.length !== 1 ? "s" : ""} pending your review.</strong> Transactions will not execute until approved.
        </div>
      )}

      <div className="bg-white border border-border rounded-xl divide-y divide-border">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4"><div className="h-14 bg-muted animate-pulse rounded" /></div>
            ))
          : approvals.length === 0
          ? <div className="text-center text-muted-foreground py-14">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No {statusFilter === "all" ? "" : statusFilter.toLowerCase() + " "}approvals found</p>
            </div>
          : approvals.map(a => (
            <div key={a.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${
                  a.status === "Pending" ? "bg-amber-100" :
                  a.status === "Approved" ? "bg-green-100" : "bg-red-100"
                }`}>
                  {a.status === "Pending"
                    ? <Clock className="w-4 h-4 text-amber-600" />
                    : a.status === "Approved"
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <XCircle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug">{a.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {moduleIcon(a.module)}
                    <span className="text-xs text-muted-foreground">{moduleLabel(a.module)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.requestedAt)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      a.status === "Pending" ? "bg-amber-100 text-amber-700" :
                      a.status === "Approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>{a.status}</span>
                  </div>
                  {a.remarks && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{a.remarks}</p>
                  )}
                </div>
              </div>
              {a.status === "Pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approve(a.id)}
                    disabled={processing === a.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-60">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => { setRejectId(a.id); setRejectRemarks(""); }}
                    disabled={processing === a.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-60">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Reject confirmation modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Reject Request</h2>
            <p className="text-sm text-muted-foreground">The request will be rejected and no transaction will be executed. Optionally add a reason.</p>
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Rejection</label>
              <textarea
                value={rejectRemarks}
                onChange={e => setRejectRemarks(e.target.value)}
                rows={3}
                placeholder="e.g. Insufficient budget, incorrect quantity..."
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={() => reject(rejectId)} disabled={processing === rejectId} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60">
                {processing === rejectId ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
