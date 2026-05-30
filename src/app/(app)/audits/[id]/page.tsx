"use client";
import { Fragment, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, Plus, Trash2, FileText, CheckCircle, PlayCircle, Package, Boxes, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Audit {
  id: number; auditTitle: string; auditType: string; departmentName: string;
  departmentId: number; auditDate: string; status: string;
  totalItems: number; shortageCount: number; excessCount: number; damagedCount: number;
  remarks: string | null;
}

interface ExistingRow {
  id: number;
  referenceId: number;
  referenceCode: string;
  conditionFound: string | null;
  expectedQuantity: number;
  physicalQuantity: number;
  damageStatus: string | null;
  remarks: string | null;
}

interface EditRow {
  key: string;
  conditionFound: string;
  physicalQty: string;
  damageStatus: string;
  remarks: string;
}

interface ItemGroup {
  refId: number;
  name: string;
  code: string;
  expected: number;
  currentCondition: string;
  rows: EditRow[];
}

interface Section {
  kind: "inventory" | "assets";
  title: string;
  groups: ItemGroup[];
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

function mapToCondition(raw: string | null | undefined): string {
  if (!raw) return "Good / Working";
  const v = raw.toLowerCase();
  if (v.includes("good") || v.includes("work") || v.includes("active") || v.includes("use")) return "Good / Working";
  if (v.includes("missing")) return "Missing";
  if (v.includes("repair")) return "Under Repair";
  if (v.includes("sever") || v.includes("beyond")) return "Severely Damaged";
  if (v.includes("damage") || v.includes("poor") || v.includes("broken")) return "Physically Damaged";
  return "Other";
}

let keyCounter = 0;
const newKey = () => `r${++keyCounter}-${Date.now()}`;

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auditRes = await fetch(`/api/audits/${id}`);
      if (!auditRes.ok) { setLoading(false); return; }
      const auditData = await auditRes.json() as Audit & { items: ExistingRow[] };
      setAudit(auditData);
      setFinalRemarks(auditData.remarks ?? "");

      const type = (auditData.auditType ?? "inventory").toLowerCase();
      const wantInventory = type === "inventory" || type === "full";
      const wantAssets = type === "assets" || type === "full";

      // Group existing audit rows by referenceCode (unique across inventory & assets).
      const existingByCode = new Map<string, ExistingRow[]>();
      for (const row of (auditData.items ?? [])) {
        const arr = existingByCode.get(row.referenceCode) ?? [];
        arr.push(row);
        existingByCode.set(row.referenceCode, arr);
      }

      const buildGroup = (
        refId: number, name: string, code: string, expected: number, currentCondition: string,
      ): ItemGroup => {
        const existing = existingByCode.get(code);
        const rows: EditRow[] = existing && existing.length > 0
          ? existing.map(e => ({
              key: newKey(),
              conditionFound: e.conditionFound ?? "Good / Working",
              physicalQty: String(e.physicalQuantity),
              damageStatus: e.damageStatus ?? "None",
              remarks: e.remarks ?? "",
            }))
          : [{
              key: newKey(),
              conditionFound: mapToCondition(currentCondition),
              physicalQty: "",
              damageStatus: "None",
              remarks: "",
            }];
        return { refId, name, code, expected, currentCondition, rows };
      };

      const newSections: Section[] = [];

      if (wantInventory) {
        const res = await fetch(`/api/inventory/items?departmentId=${auditData.departmentId}&limit=500`);
        const data = await res.json() as { data: Array<{ id: number; itemName: string; itemCode: string; currentStock: number; status?: string }> };
        const groups = (data.data ?? []).map(d =>
          buildGroup(d.id, d.itemName, d.itemCode, d.currentStock, d.status ?? "Good / Working"));
        newSections.push({ kind: "inventory", title: "Inventory Items", groups });
      }

      if (wantAssets) {
        const res = await fetch(`/api/assets?departmentId=${auditData.departmentId}&limit=500`);
        const data = await res.json() as { data: Array<{ id: number; assetName: string; assetCode: string; quantity: number; condition?: string }> };
        const groups = (data.data ?? []).map(d =>
          buildGroup(d.id, d.assetName, d.assetCode, d.quantity ?? 1, d.condition ?? "Good"));
        newSections.push({ kind: "assets", title: "Assets", groups });
      }

      setSections(newSections);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function mutateGroup(sIdx: number, gIdx: number, fn: (g: ItemGroup) => ItemGroup) {
    setSections(secs => secs.map((s, si) =>
      si !== sIdx ? s : { ...s, groups: s.groups.map((g, gi) => gi !== gIdx ? g : fn(g)) }));
  }

  function addRow(sIdx: number, gIdx: number) {
    mutateGroup(sIdx, gIdx, g => ({
      ...g,
      rows: [...g.rows, { key: newKey(), conditionFound: "Good / Working", physicalQty: "", damageStatus: "None", remarks: "" }],
    }));
  }

  function removeRow(sIdx: number, gIdx: number, key: string) {
    mutateGroup(sIdx, gIdx, g => ({
      ...g,
      rows: g.rows.length > 1 ? g.rows.filter(r => r.key !== key) : g.rows,
    }));
  }

  function updateRow(sIdx: number, gIdx: number, key: string, field: keyof EditRow, value: string) {
    mutateGroup(sIdx, gIdx, g => ({
      ...g,
      rows: g.rows.map(r => r.key === key ? { ...r, [field]: value } : r),
    }));
  }

  async function saveAudit() {
    setSaving(true);
    const rows: Array<Record<string, unknown>> = [];
    for (const section of sections) {
      for (const group of section.groups) {
        for (const r of group.rows) {
          if (r.physicalQty === "") continue; // only persist filled-in counts
          rows.push({
            referenceId: group.refId,
            referenceName: group.name,
            referenceCode: group.code,
            expectedQuantity: group.expected,
            physicalQuantity: parseInt(r.physicalQty) || 0,
            conditionFound: r.conditionFound,
            damageStatus: r.damageStatus,
            remarks: r.remarks,
          });
        }
      }
    }

    const res = await fetch(`/api/audits/${id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Audit saved — ${rows.length} entr${rows.length === 1 ? "y" : "ies"} recorded`);
      load();
    } else {
      toast.error("Failed to save audit");
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

  const allGroups = sections.flatMap(s => s.groups);
  const totalGroups = allGroups.length;
  const auditedCount = allGroups.filter(g => g.rows.some(r => r.physicalQty !== "")).length;
  const totalExpected = allGroups.reduce((s, g) => s + g.expected, 0);
  const totalPhysical = allGroups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + (parseInt(r.physicalQty) || 0), 0), 0);
  const shortageCount = allGroups.filter(g => {
    if (!g.rows.some(r => r.physicalQty !== "")) return false;
    const phy = g.rows.reduce((s, r) => s + (parseInt(r.physicalQty) || 0), 0);
    return phy < g.expected;
  }).length;

  const colCount = isEditable ? 6 : 5;

  return (
    <div className="p-6 space-y-6 pb-28">
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
          { label: "Items Audited", value: `${auditedCount} / ${totalGroups}`, color: "text-blue-600" },
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

      {isEditable && (
        <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
          All items in <strong>{audit.departmentName}</strong> are pre-loaded below with their expected quantities.
          Fill in the <strong>Physical Qty</strong> for each item. Use <strong>+ Split condition</strong> if one item
          spans multiple conditions (e.g. some Good, some Damaged). Click <strong>Save Audit</strong> when done.
        </p>
      )}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.kind} className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            {section.kind === "inventory" ? <Boxes className="w-4 h-4 text-muted-foreground" /> : <Package className="w-4 h-4 text-muted-foreground" />}
            <h2 className="font-semibold text-sm">{section.title}</h2>
            <span className="text-xs text-muted-foreground">— {section.groups.length} item{section.groups.length !== 1 ? "s" : ""} in {audit.departmentName}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-64">Item</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground min-w-[150px]">Condition</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-24">Expected</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-28">Physical Qty</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-36">Damage Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Remarks</th>
                  {isEditable && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {section.groups.length === 0 ? (
                  <tr>
                    <td colSpan={colCount + 1} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No {section.kind === "inventory" ? "inventory items" : "assets"} in {audit.departmentName}</p>
                    </td>
                  </tr>
                ) : section.groups.map((group, gIdx) => {
                  const totalPhy = group.rows.reduce((s, r) => s + (parseInt(r.physicalQty) || 0), 0);
                  const anyFilled = group.rows.some(r => r.physicalQty !== "");
                  const diff = totalPhy - group.expected;

                  return (
                    <Fragment key={group.code || group.refId}>
                      {group.rows.map((row, rIdx) => (
                        <tr
                          key={row.key}
                          className={`border-t ${rIdx === 0 ? "border-border" : "border-border/30"} ${gIdx % 2 === 0 ? "" : "bg-slate-50/40"}`}
                        >
                          {/* Item cell — only on first row, spans the group via rowSpan */}
                          {rIdx === 0 ? (
                            <td className="px-4 py-2 align-top" rowSpan={group.rows.length}>
                              <div className="font-medium">{group.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{group.code}</span>
                              </div>
                              {anyFilled && (
                                <div className="text-xs mt-1.5">
                                  <span className="text-muted-foreground">Counted: </span>
                                  <strong className={diff < 0 ? "text-red-600" : diff > 0 ? "text-green-600" : "text-emerald-600"}>{totalPhy}</strong>
                                  <span className="text-muted-foreground">/{group.expected}</span>
                                  {diff !== 0 && <span className={diff < 0 ? "text-red-600" : "text-green-600"}> ({diff > 0 ? "+" : ""}{diff})</span>}
                                  {diff === 0 && <span className="text-emerald-600"> ✓</span>}
                                </div>
                              )}
                            </td>
                          ) : null}

                          <td className="px-4 py-2">
                            {isEditable ? (
                              <select
                                value={row.conditionFound}
                                onChange={e => updateRow(sIdx, gIdx, row.key, "conditionFound", e.target.value)}
                                className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                              >
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conditionBadge(row.conditionFound)}`}>
                                {row.conditionFound}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{group.expected}</td>

                          <td className="px-4 py-2">
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                placeholder="—"
                                value={row.physicalQty}
                                onChange={e => updateRow(sIdx, gIdx, row.key, "physicalQty", e.target.value)}
                                className="w-full border border-input rounded-md px-2 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                              />
                            ) : (
                              <span className="font-mono font-semibold">{row.physicalQty || "—"}</span>
                            )}
                          </td>

                          <td className="px-4 py-2">
                            {isEditable ? (
                              <select
                                value={row.damageStatus}
                                onChange={e => updateRow(sIdx, gIdx, row.key, "damageStatus", e.target.value)}
                                className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                              >
                                {DAMAGE_STATUSES.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{row.damageStatus}</span>
                            )}
                          </td>

                          <td className="px-4 py-2">
                            {isEditable ? (
                              <input
                                placeholder="Remarks..."
                                value={row.remarks}
                                onChange={e => updateRow(sIdx, gIdx, row.key, "remarks", e.target.value)}
                                className="w-full border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{row.remarks || "—"}</span>
                            )}
                          </td>

                          {isEditable && (
                            <td className="px-2 py-2 text-center">
                              {group.rows.length > 1 && (
                                <button
                                  onClick={() => removeRow(sIdx, gIdx, row.key)}
                                  title="Remove this condition row"
                                  className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}

                      {isEditable && (
                        <tr className={`${gIdx % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                          <td className="px-4 pb-2 pt-0" colSpan={colCount + 1}>
                            <button
                              onClick={() => addRow(sIdx, gIdx)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 ml-1"
                            >
                              <Plus className="w-3 h-3" /> Split condition
                            </button>
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
      ))}

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

      {/* Sticky Save bar */}
      {isEditable && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-border px-6 py-3 flex items-center justify-between z-20">
          <span className="text-sm text-muted-foreground">
            {auditedCount} of {totalGroups} items counted · {totalPhysical} physical units recorded
          </span>
          <button
            onClick={saveAudit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Audit"}
          </button>
        </div>
      )}
    </div>
  );
}
