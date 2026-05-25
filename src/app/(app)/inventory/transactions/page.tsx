"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Transaction {
  id: number; itemName: string; itemCode: string; transactionType: string;
  quantity: number; beforeStock: number; afterStock: number;
  departmentName: string; transactionDate: string; approvalStatus: string;
  fromDepartmentName: string | null; toDepartmentName: string | null;
}

const TX_COLORS: Record<string, string> = {
  "Purchase/Stock In": "text-green-600", "Return": "text-green-500",
  "Usage/Stock Out": "text-red-600", "Issue to Staff": "text-red-500",
  "Damage": "text-orange-600", "Discard/Scrap": "text-red-800",
  "Transfer": "text-blue-600",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txType, setTxType] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (txType) p.set("type", txType);
    fetch(`/api/inventory/transactions?${p}`)
      .then((r) => r.json())
      .then((d: { data: Transaction[]; total: number }) => { setTransactions(d.data); setTotal(d.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [txType, page]);

  useEffect(() => { load(); }, [load]);

  const TYPES = ["Purchase/Stock In", "Return", "Usage/Stock Out", "Issue to Staff", "Damage", "Transfer"];

  function TxIcon({ type }: { type: string }) {
    if (["Purchase/Stock In", "Return"].includes(type)) return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
    if (type === "Transfer") return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
    return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Stock Transactions</h1><p className="text-sm text-muted-foreground">{total} records</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setTxType(""); setPage(1); }} className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${!txType ? "bg-blue-600 text-white border-blue-600" : "border-input hover:bg-muted"}`}>All</button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => { setTxType(t); setPage(1); }} className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${txType === t ? "bg-blue-600 text-white border-blue-600" : "border-input hover:bg-muted"}`}>{t}</button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">From/To</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
                : transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TxIcon type={tx.transactionType} />
                          <span className={`text-xs font-medium ${TX_COLORS[tx.transactionType] ?? ""}`}>{tx.transactionType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/inventory/items/${tx.id}`} className="hover:text-blue-600">
                          <p className="font-medium">{tx.itemName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tx.itemCode}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{tx.departmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {tx.fromDepartmentName && <span>From: {tx.fromDepartmentName}</span>}
                        {tx.toDepartmentName && <span>To: {tx.toDepartmentName}</span>}
                        {!tx.fromDepartmentName && !tx.toDepartmentName && "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${tx.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                        {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{tx.afterStock}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(tx.transactionDate)}</td>
                    </tr>
                  ))
              }
              {!loading && transactions.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No transactions found</td></tr>}
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
