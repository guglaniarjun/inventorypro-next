"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface User { id: number; username: string; fullName: string; email: string; role: string; status: string; lastLoginAt: string | null; department?: { departmentName: string } | null; }

const ROLES = ["tenant_super_admin","admin","department_incharge","staff","auditor"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", fullName: "", email: "", password: "", role: "staff", phone: "" });
  const [saving, setSaving] = useState(false);
  const [depts, setDepts] = useState<Array<{ id: number; departmentName: string }>>([]);
  const [deptId, setDeptId] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/users?limit=100&status=all")
      .then(r => r.json())
      .then((d: { data: User[] }) => { setUsers(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); fetch("/api/departments?limit=100").then(r => r.json()).then((d: { data: typeof depts }) => setDepts(d.data)); }, []);

  const filtered = users.filter(u => !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, departmentId: deptId ? parseInt(deptId) : null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("User created"); setShowAdd(false); setForm({ username: "", fullName: "", email: "", password: "", role: "staff", phone: "" }); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Users</h1><p className="text-sm text-muted-foreground">{users.length} users</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Login</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>)
              : filtered.map(u => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs font-medium capitalize">{u.role.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.department?.departmentName ?? "-"}</td>
                <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-10">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Add User</h2>
            {[
              { label: "Full Name *", key: "fullName", type: "text", required: true },
              { label: "Username *", key: "username", type: "text", required: true },
              { label: "Email *", key: "email", type: "email", required: true },
              { label: "Password *", key: "password", type: "password", required: true },
              { label: "Phone", key: "phone", type: "text", required: false },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div><label className="block text-sm font-medium mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Department</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
