"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface User { id: number; username: string; fullName: string; email: string; role: string; status: string; lastLoginAt: string | null; department?: { departmentName: string } | null; }

const ROLES = ["tenant_super_admin","admin","department_incharge","staff","auditor"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add user modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", fullName: "", email: "", password: "", role: "staff", phone: "" });
  const [addDeptId, setAddDeptId] = useState("");

  // Edit user modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", role: "", status: "", phone: "" });
  const [editDeptId, setEditDeptId] = useState("");

  // Change password modal
  const [pwdUser, setPwdUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [depts, setDepts] = useState<Array<{ id: number; departmentName: string }>>([]);

  const load = () => {
    setLoading(true);
    fetch("/api/users?limit=200&status=all")
      .then(r => r.json())
      .then((d: { data: User[] }) => { setUsers(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/departments?limit=100").then(r => r.json()).then((d: { data: typeof depts }) => setDepts(d.data));
  }, []);

  const filtered = users.filter(u =>
    !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  // Add user
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, departmentId: addDeptId ? parseInt(addDeptId) : null }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("User created");
      setShowAdd(false);
      setAddForm({ username: "", fullName: "", email: "", password: "", role: "staff", phone: "" });
      setAddDeptId("");
      load();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Failed to create user");
    }
  }

  // Open edit modal
  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, role: u.role, status: u.status, phone: "" });
    setEditDeptId("");
  }

  // Save edit
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, departmentId: editDeptId ? parseInt(editDeptId) : null }),
    });
    setSaving(false);
    if (res.ok) { toast.success("User updated"); setEditUser(null); load(); }
    else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
  }

  // Delete (deactivate)
  async function handleDelete(u: User) {
    if (!confirm(`Deactivate user "${u.fullName}"? They will no longer be able to log in.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("User deactivated"); load(); }
    else toast.error("Failed to deactivate user");
  }

  // Change password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdUser) return;
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    const res = await fetch(`/api/users/${pwdUser.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Password changed"); setPwdUser(null); setNewPassword(""); setConfirmPassword(""); }
    else toast.error("Failed to change password");
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Login</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td></tr>
                ))
              : filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-secondary rounded-full text-xs font-medium capitalize">{u.role.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.department?.departmentName ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} title="Edit user" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setPwdUser(u); setNewPassword(""); setConfirmPassword(""); }} title="Change password" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(u)} title="Deactivate user" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-10">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add User</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            {([
              { label: "Full Name *", key: "fullName", type: "text", required: true },
              { label: "Username *", key: "username", type: "text", required: true },
              { label: "Email *", key: "email", type: "email", required: true },
              { label: "Password *", key: "password", type: "password", required: true },
              { label: "Phone", key: "phone", type: "text", required: false },
            ] as const).map(({ label, key, type, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input type={type} value={addForm[key as keyof typeof addForm]} onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))} required={required} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select value={addDeptId} onChange={e => setAddDeptId(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Create User"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEdit} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit User — <span className="font-mono text-sm text-muted-foreground">@{editUser.username}</span></h2>
              <button type="button" onClick={() => setEditUser(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input type="text" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select value={editDeptId} onChange={e => setEditDeptId(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {pwdUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <button type="button" onClick={() => setPwdUser(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Setting new password for <span className="font-semibold text-foreground">{pwdUser.fullName}</span></p>
            <div>
              <label className="block text-sm font-medium mb-1">New Password *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Repeat password" className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setPwdUser(null)} className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-60">{saving ? "Saving..." : "Change Password"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
