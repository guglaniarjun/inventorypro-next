"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface TenantInfo { id: number; name: string; code: string; address: string | null; contactPerson: string | null; phone: string | null; email: string | null; subscriptionPlan: string; }

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [form, setForm] = useState({ name: "", address: "", contactPerson: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{ tenantId: number | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then((u: { tenantId: number | null }) => {
      setUser(u);
      if (u.tenantId) {
        fetch(`/api/tenants/${u.tenantId}`).then(r => r.json()).then((t: TenantInfo) => {
          setTenant(t);
          setForm({ name: t.name, address: t.address ?? "", contactPerson: t.contactPerson ?? "", phone: t.phone ?? "", email: t.email ?? "" });
        });
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId) return;
    setSaving(true);
    const res = await fetch(`/api/tenants/${user.tenantId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, address: form.address || null, contactPerson: form.contactPerson || null, phone: form.phone || null, email: form.email || null }),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved");
    else toast.error("Failed to save");
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-muted-foreground" />
        <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Organization configuration</p></div>
      </div>

      {tenant && (
        <form onSubmit={handleSave} className="bg-white border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="font-semibold">{tenant.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{tenant.code} · {tenant.subscriptionPlan}</p>
            </div>
          </div>
          {[
            { label: "Organization Name *", key: "name", required: true },
            { label: "Contact Person", key: "contactPerson", required: false },
            { label: "Phone", key: "phone", required: false },
            { label: "Email", key: "email", required: false },
            { label: "Address", key: "address", required: false },
          ].map(({ label, key, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required} className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
