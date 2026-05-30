"use client";
import { Fragment, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, Plus, Trash2, FileText, CheckCircle, PlayCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Audit {
  id: number; auditTitle: string; auditType: string; departmentName: string;
  departmentId: number; auditDate: string; status: string;
  totalItems: number; shortageCount: number; excessCount: number; damagedCount: number;
  remarks: string | null;
}

interface DeptItem {
  id: number; itemName: string; itemCode: string; currentStock: number;
}

interface ConditionRow {
  id: number;
  referenceId: number;
  conditionFound: string | null;
  expectedQuantity: number;
  physicalQuantity: number;
  damageStatus: string | null;
  remarks: string | null;
}

interface NewRow {
  tempId: string;
  conditionFound: string;
  physicalQty: string;
  damageStatus: string;
  remarks: string;
  saving: boolean;
}

interface ItemGroup {
  item: DeptItem;
  rows: ConditionRow[];
  newRows: NewRow[];
}

const CONDITIONS = [
  "Good / Working",
  "Missing",
  "Physically Damaged",
  "Severely Damaged",
  "Under Repair",
  "Other",
];

const DAMAGE_STATUSES = ["None", "Minor Damage", "Major Damage", "Beyond Repair", "Missing"];

const conditionBadge = (c: string | null) => {
  if (!c) return "bg-gray-100 text-gray-600";
  if (c.includes("Good")) return "bg-green-100 text-green-700";
  if (c === "Missing") return "bg-red-100 text-red-700";
  if (c.includes("Repair")) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auditRes = await fetch(`/api/audits/${id}`);
      if (!auditRes.ok) { setLoading(false); return; }
      const auditData = await auditRes.json() as Audit & { items: ConditionRow[] };
      setAudit(auditData);
      setFinalRemarks(auditData.remarks ?? "");

      const isAsset = auditData.auditType?.toLowerCase().includes("asset");
      const deptRes = await fetch(
        isAsset
          ? `/api/assets?departmentId=${auditData.departmentId}&limit=300`
          : `/api/inventory/items?departmentId=${auditData.departmentId}&limit=300`
      );
      const deptData = await deptRes.json() as { data: Array<{ id: number; itemName?: string; assetName?: string; itemCode?: string; assetCode?: string; currentStock?: number; quantity?: number }> };
      const deptItems: DeptItem[] = (deptData.data ?? []).map(d => ({
        id: d.id,
        itemName: d.itemName ?? d.assetName ?? "",
        itemCode: d.itemCode ?? d.assetCode ?? "",
        currentStock: d.currentStock ?? d.quantity ?? 1,
      }));

      const rowsByRef = new Map<number, ConditionRow[]>();
      for (const row of (auditData.items ?? [])) {
        const arr = rowsByRef.get(row.referenceId) ?? [];
        arr.push(row);
        rowsByRef.set(row.referenceId, arr);
      }

      const grouped: ItemGroup[] = deptItems.map(item => ({
        item,
        rows: rowsByRef.get(item.id) ?? [],
        newRows: [],
      }));

      setGroups(grouped);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function addNewRow(gIdx: number) {
    setGroups(g => {
      const next = [...g];
      next[gIdx] = {
        ...next[gIdx],
        newRows: [...next[gIdx].newRows, {
          tempId: `${Date.now()}-${Math.random()}`,
          conditionFound: "Good / Working",
          physicalQty: "",
          damageStatus: "None",
          remarks: "",
          saving: false,
        }],
      };
      return next;
    });
  }

  function updateNewRow(gIdx: number, tempId: string, field: keyof NewRow, value: string) {
    setGroups(g => {
      const next = [...g];
      next[gIdx] = {
        ...next[gIdx],
        newRows: next[gIdx].newRows.map(r => r.tempId === tempId ? { ...r, [field]: value } : r),
      };
      return next;
    });
  }

  function cancelNewRow(gIdx: number, tempId: string) {
    setGroups(g => {
      const next = [...g];
      next[gIdx] = { ...next[gIdx], newRows: next[gIdx].newRows.filter(r => r.tempId !== tempId) };
      return next;
    });
  }

  async function saveNewRow(gIdx: number, tempId: string) {
    const group = groups[gIdx];
    const row = group.newRows.find(r => r.tempId === tempId);
    if (!row) return;

    setGroups(g => {
      const next = [...g];
      next[gIdx] = { ...next[gIdx], newRows: next[gIdx].newRows.map(r => r.tempId === tempId ? { ...r, saving: true } : r) };
      return next;
    });

    const res = await fetch(`/api/audits/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId: group.item.id,
        referenceName: group.item.itemName,
        referenceCode: group.item.itemCode,
        expectedQuantity: group.item.currentStock,
        physicalQuantity: parseInt(row.physicalQty) || 0,
        conditionFound: row.conditionFound,
        damageStatus: row.damageStatus !== "None" ? row.damageStatus : null,
        remarks: row.remarks || null,
      }),
    });

    if (res.ok) {
      const saved = await res.json() as ConditionRow;
      toast.success("Condition recorded");
      setGroups(g => {
        const next = [...g];
        next[gIdx] = {
          ...next[gIdx],
          rows: [...next[gIdx].rows, saved],
          newRows: next[gIdx].newRows.filter(r => r.tempId !== tempId),
        };
        return next;
      });
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed to save");
      setGroups(g => {
        const next = [...g];
        next[gIdx] = { ...next[gIdx], newRows: next[gIdx].newRows.map(r => r.tempId === tempId ? { ...r, saving: false } : r) };
        return next;
      });
    }
  }

  async function deleteRow(gIdx: number, rowId: number) {
    setDeleting(rowId);
    const res = await fetch(`/api/audits/${id}/items/${rowId}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      toast.success("Entry removed");
      setGroups(g => {
        const next = [...g];
        next[gIdx] = { ...next[gIdx], rows: next[gIdx].rows.filter(r => r.id !== rowId) };
        return next;
      });
    } else {
      toast.error("Failed to remove entry");
    }
  }

  async function updateStatus(status: string) {
    const res = await fetch(`/api/audits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Audit marked as ${status}`); setAudit(a => a ? { ...a, status } : a); }
    else toast.error("Failed to update status");
  }

  async function saveFinalRemarks() {
    setSavingRemarks(true);
    const res = await fetch(`/api/audits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks: finalRemarks }),
    });
    setSavingRemarks(false);
    if (res.ok) toast.success("Final report saved");
    else toast.error("Failed to save");
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );
  if (!audit) return <div className="p-6 text-center text-muted-foreground">Audit not found</div>;

  const statusColor = ({ Draft: "bg-gray-100 text-gray-700", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700" } as Record<string, string>)[audit.status] ?? "bg-secondary text-secondary-foreground";
  const isEditable = audit.status !== "Completed";

  const auditedCount = groups.filter(g => g.rows.length > 0).length;
  const totalExpected = groups.filter(g => g.rows.length > 0).reduce((s, g) => s + g.item.currentStock, 0);
  const totalPhysical = groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.physicalQuantity, 0), 0);
  const shortageCount = groups.filter(g => {
    if (!g.rows.length) return false;
    const phy = g.rows.reduce((s, r) => s + r.physicalQuantity, 0);
    return phy < g.item.currentStock;
  }).length;

  const colCount = isEditable ? 7 : 6;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => window.history.back()} className="p-2 border border-input rounded-lg hover:bg-muted mt-0.5 shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{audit.auditTitle}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
            <span>{audit.departmentName}</span>
            <span>·</span>
            <span>{formatDate(audit.auditDate)}</span>
            <span>·</span>
            <span className="capitalize">{audit.auditType} Audit</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{audit.status}</span>
          </div>
        </div>
        {isEditable && (
          <div className="flex gap-2 shrink-0">
            {audit.status === "Draft" && (
              <button onClick={() => updateStatus("In Progress")} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">
                <PlayCircle className="w-4 h-4" /> Start Audit
              </button>
            )}
            {audit.status === "In Progress" && (
              <button onClick={() => updateStatus("Completed")} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500">
                <CheckCircle className="w-4 h-4" /> Mark Complete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Items Audited", value: `${auditedCount} / ${groups.length}`, color: "text-blue-600" },
          { label: "Shortages", value: shortageCount, color: shortageCount > 0 ? "text-red-600" : "text-gray-700" },
          { label: "Expected Total", value: totalExpected, color: "text-gray-700" },
          { label: "Physical Total", value: totalPhysical, color: totalPhysical < totalExpected && totalExpected > 0 ? "text-red-600" : "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">
            {audit.auditType === "assets" ? "Assets" : "Inventory Items"} — {audit.departmentName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {groups.length} item{groups.length !== 1 ? "s" : ""} in department
            {isEditable && " \u00b7 Use \u201c+ Add Condition\u201d on each item row to record physical counts"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-56">Item</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">Condition</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Expected Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Physical Qty</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-36">Damage Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Remarks</th>
                {isEditable && <th className="w-20" />}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-16 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items found in {audit.departmentName}</p>
                  </td>
                </tr>
              ) : groups.map((group, gIdx) => {
                const totalPhy = group.rows.reduce((s, r) => s + r.physicalQuantity, 0);
                const diff = totalPhy - group.item.currentStock;
                const hasEntries = group.rows.length > 0 || group.newRows.length > 0;

                return (
                  <Fragment key={group.item.id}>
                    {/* Item header row */}
                    <tr className={`border-t-2 border-border ${gIdx % 2 === 0 ? "bg-slate-50/80" : "bg-blue-50/30"}`}>
                      <td className="px-4 py-2.5" colSpan={colCount}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                              <span className="font-semibold text-sm">{group.item.itemName}</span>
                              <span className="ml-2 text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{group.item.itemCode}</span>
                            </div>
                            <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                              Stock: <strong>{group.item.currentStock}</strong>
                            </span>
                            {group.rows.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Physical: <strong className={diff < 0 ? "text-red-600" : diff > 0 ? "text-green-600" : "text-gray-700"}>{totalPhy}</strong>
                                {diff !== 0 && <span className={`ml-1 ${diff < 0 ? "text-red-600" : "text-green-600"}`}>({diff > 0 ? "+" : ""}{diff})</span>}
                              </span>
                            )}
                          </div>
                          {isEditable && (
                            <button
                              onClick={() => addNewRow(gIdx)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-100 border border-blue-200 shrink-0 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add Condition
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Saved condition rows */}
                    {group.rows.map(row => (
                      <tr key={row.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="px-4 py-2 pl-14" />
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conditionBadge(row.conditionFound)}`}>
                            {row.conditionFound ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{group.item.currentStock}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{row.physicalQuantity}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{row.damageStatus ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{row.remarks ?? "—"}</td>
                        {isEditable && (
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => deleteRow(gIdx, row.id)}
                              disabled={deleting === row.id}
                              title="Remove entry"
                              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-40 transition-colors"
                            >
                              {deleting === row.id
                                ? <span className="text-xs">...</span>
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* New unsaved rows */}
                    {group.newRows.map(newRow => (
                      <tr key={newRow.tempId} className="border-t border-blue-200 bg-blue-50/40">
                        <td className="px-4 py-2 pl-14" />
                        <td className="px-4 py-2">
                          <select
                            value={newRow.conditionFound}
                            onChange={e => updateNewRow(gIdx, newRow.tempId, "conditionFound", e.target.value)}
                            disabled={newRow.saving}
                            className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                          >
                            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{group.item.currentStock}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={newRow.physicalQty}
                            onChange={e => updateNewRow(gIdx, newRow.tempId, "physicalQty", e.target.value)}
                            disabled={newRow.saving}
                            className="w-full border border-input rounded-md px-2 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={newRow.damageStatus}
                            onChange={e => updateNewRow(gIdx, newRow.tempId, "damageStatus", e.target.value)}
                            disabled={newRow.saving}
                            className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                          >
                            {DAMAGE_STATUSES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            placeholder="Remarks..."
                            value={newRow.remarks}
                            onChange={e => updateNewRow(gIdx, newRow.tempId, "remarks", e.target.value)}
                            disabled={newRow.saving}
                            className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => saveNewRow(gIdx, newRow.tempId)}
                              disabled={newRow.saving || !newRow.physicalQty}
                              className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                            >
                              {newRow.saving ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() => cancelNewRow(gIdx, newRow.tempId)}
                              disabled={newRow.saving}
                              className="px-2 py-1 text-xs border border-input rounded-md hover:bg-muted"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Summary row — only when there are entries */}
                    {hasEntries && (
                      <tr className="border-t border-border/40 bg-muted/30">
                        <td className="px-4 py-1.5 pl-14" />
                        <td className="px-4 py-1.5 text-xs font-semibold text-muted-foreground">Total</td>
                        <td className="px-4 py-1.5 text-right font-mono text-xs text-muted-foreground">{group.item.currentStock}</td>
                        <td className={`px-4 py-1.5 text-right font-mono text-xs font-bold ${
                          diff < 0 ? "text-red-600" : diff > 0 ? "text-green-600" : "text-emerald-600"
                        }`}>
                          {totalPhy}
                        </td>
                        <td className="px-4 py-1.5 text-xs" colSpan={isEditable ? 3 : 2}>
                          {diff < 0 && <span className="text-red-600 font-medium">⚠ Shortage: {Math.abs(diff)}</span>}
                          {diff > 0 && <span className="text-green-600 font-medium">↑ Excess: {diff}</span>}
                          {diff === 0 && group.rows.length > 0 && <span className="text-emerald-600 font-medium">✓ Match</span>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Report */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Auditor&apos;s Final Report</h2>
        </div>
        <p className="text-xs text-muted-foreground">Summarize findings, discrepancies, and recommended actions for this audit.</p>
        <textarea
          value={finalRemarks}
          onChange={e => setFinalRemarks(e.target.value)}
          rows={4}
          placeholder="e.g. 10 items found with shortage, 3 items beyond repair, recommend immediate restocking of..."
          className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex justify-end">
          <button onClick={saveFinalRemarks} disabled={savingRemarks} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">
            {savingRemarks ? "Saving..." : "Save Final Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
