"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Item {
  id: number; itemName: string; itemCode: string; category: string; itemType: string;
  description: string | null; usedFor: string | null; unit: string;
  currentStock: number; openingStock: number; minimumStockLevel: number; reorderLevel: number;
  departmentName: string; locationPath: string | null; rackNo: string | null; shelfNo: string | null;
  status: string; isLowStock: boolean; itemPhoto: string | null;
  recentTransactions: Array<{
    id: number; transactionType: string; quantity: number; afterStock: number;
    transactionDate: string; remarks: string | null;
    fromDepartmentName: string | null; toDepartmentName: string | null;
  }>;
}

const TX_TYPES_IN = ["Purchase/Stock In", "Return", "Transfer"];
const TX_TYPES_OUT = ["Usage/Stock Out", "Issue to Staff", "Damage", "Discard/Scrap"];

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockOpen, setStockOpen] = useState(false);
  const [txType, setTxType] = useState("Purchase/Stock In");
  const [quantity, setQuantity] = useState(1);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txRemarks, setTxRemarks] = useState("");
  const [fromDeptId, setFromDeptId] = useState("");
  const [toDeptId, setToDeptId] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [depts, setDepts] = useState<Array<{ id: number; departmentName: string }>>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/inventory/items/${id}`)
      .then((r) => r.json())
      .then((d: Item) => { setItem(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/departments?limit=100").then((r) => r.json()).then((d: { data: Array<{ id: number; departmentName: string }> }) => setDepts(d.data));
  }, []);

  const isTransfer = txType === "Transfer";
  const isStockIn = ["Purchase/Stock In", "Return"].includes(txType);
  const isStockOut = ["Usage/Stock Out", "Issue to Staff"].includes(txType);

  async function handleStockAction() {
    if (!item) return;
    setSaving(true);
    let finalRemarks = txRemarks;
    if (isStockIn && fromText) finalRemarks = `From: ${fromText}${txRemarks ? ` | ${txRemarks}` : ""}`;
    if (isStockOut && toText) finalRemarks = `To: ${toText}${txRemarks ? ` | ${txRemarks}` : ""}`;

    const res = await fetch("/api/inventory/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id, transactionType: txType, quantity, transactionDate: txDate,
        remarks: finalRemarks || undefined,
        fromDepartmentId: isTransfer && fromDeptId ? Number(fromDeptId) : undefined,
        toDepartmentId: isTransfer && toDeptId ? Number(toDeptId) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Transaction recorded");
      setStockOpen(false);
      setTxRemarks(""); setQuantity(1); setFromDeptId(""); setToDeptId(""); setFromText(""); setToText("");
      load();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed");
    }
  }

  if (loading) return <div className="p-6"><div className="h-32 bg-muted animate-pulse rounded-xl" /></div>;
  if (!item) return <div className="p-6 text-center text-muted-foreground">Item not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 border border-input rounded-lg hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{item.itemName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-muted-foreground text-sm">{item.itemCode}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              item.status === "Active" ? "bg-green-100 text-green-700" :
              item.status === "Low Stock" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            }`}>{item.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Information</h2>
          {item.itemPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.itemPhoto} alt={item.itemName} className="w-48 h-48 object-cover rounded-xl border border-border shadow-sm" />
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Category</p><p className="font-medium">{item.category}</p></div>
            <div><p className="text-muted-foreground">Type</p><p className="font-medium">{item.itemType}</p></div>
            <div><p className="text-muted-foreground">Department</p>
              <Link href={`/departments/${id}`} className="font-medium text-blue-600 hover:underline">{item.departmentName}</Link>
            </div>
            <div><p className="text-muted-foreground">Used For</p><p className="font-medium">{item.usedFor || "-"}</p></div>
          </div>
          {item.description && <div className="text-sm"><p className="text-muted-foreground">Description</p><p className="mt-1">{item.description}</p></div>}
          {item.locationPath && (
            <div className="pt-3 border-t border-border text-sm">
              <p className="font-medium flex items-center gap-1.5 mb-1"><MapPin className="w-4 h-4 text-muted-foreground" />Location</p>
              <p className="text-muted-foreground">{item.locationPath}</p>
              {(item.rackNo || item.shelfNo) && <p className="text-xs text-muted-foreground mt-0.5">{item.rackNo ? `Rack: ${item.rackNo}` : ""} {item.shelfNo ? `Shelf: ${item.shelfNo}` : ""}</p>}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-5">
          <h2 className="font-semibold">Stock Status</h2>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Stock</p>
            <p className={`text-4xl font-bold mt-1 ${item.isLowStock ? "text-amber-600" : ""}`}>{item.currentStock}</p>
            <p className="text-muted-foreground text-sm">{item.unit}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Opening Stock</span><span className="font-mono">{item.openingStock}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Min Level</span><span className="font-mono">{item.minimumStockLevel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reorder Level</span><span className="font-mono">{item.reorderLevel}</span></div>
          </div>
          <button onClick={() => setStockOpen(true)} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
            <ArrowLeftRight className="w-4 h-4" /> Stock Action
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Recent Transactions</h2>
        </div>
        {item.recentTransactions.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">From/To</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {item.recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(tx.transactionDate)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs font-medium">{tx.transactionType}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{tx.toDepartmentName ?? tx.fromDepartmentName ?? tx.remarks?.split("|")[0]?.slice(0, 30) ?? "-"}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${tx.quantity > 0 ? "text-green-600" : "text-red-600"}`}>{tx.quantity > 0 ? "+" : ""}{tx.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{tx.afterStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-muted-foreground py-10 text-sm">No transactions recorded</p>
        )}
      </div>

      {/* Stock Action Modal */}
      {stockOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Stock Action — {item.itemName}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Transaction Type</label>
              <select value={txType} onChange={(e) => { setTxType(e.target.value); setFromDeptId(""); setToDeptId(""); setFromText(""); setToText(""); }}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <optgroup label="Stock In">{TX_TYPES_IN.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
                <optgroup label="Stock Out">{TX_TYPES_OUT.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
              </select>
            </div>

            {isTransfer && (
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "From Dept", val: fromDeptId, set: setFromDeptId }, { label: "To Dept", val: toDeptId, set: setToDeptId }].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <select value={val} onChange={(e) => set(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select</option>
                      {depts.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {isStockIn && (
              <div>
                <label className="block text-sm font-medium mb-1">Received From <span className="text-muted-foreground font-normal">(supplier)</span></label>
                <input value={fromText} onChange={(e) => setFromText(e.target.value)} placeholder="e.g. ABC Supplies Ltd" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            {isStockOut && (
              <div>
                <label className="block text-sm font-medium mb-1">{txType === "Issue to Staff" ? "Issued To" : "Used By / For"}</label>
                <input value={toText} onChange={(e) => setToText(e.target.value)} placeholder="e.g. Dr. Sharma" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity ({item.unit})</label>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea value={txRemarks} onChange={(e) => setTxRemarks(e.target.value)} rows={2} placeholder="Optional notes..." className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current</span>
                <span className="font-mono font-semibold">{item.currentStock} {item.unit}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">After</span>
                <span className={`font-mono font-semibold ${TX_TYPES_IN.includes(txType) ? "text-green-600" : "text-red-600"}`}>
                  {TX_TYPES_IN.includes(txType) ? item.currentStock + quantity : Math.max(0, item.currentStock - quantity)} {item.unit}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setStockOpen(false)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleStockAction} disabled={saving || quantity < 1} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
