"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Package, Box, MapPin, Users,
  ClipboardCheck, BarChart3, History, Search, Settings,
  ShieldCheck, LogOut, ChevronLeft, ChevronRight, Menu,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/inventory/items", label: "Inventory", icon: Package },
  { href: "/assets", label: "Assets", icon: Box },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/users", label: "Users", icon: Users, roles: ["tenant_super_admin", "admin"] },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck, roles: ["tenant_super_admin", "admin"] },
  { href: "/audits", label: "Audits", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/activity-logs", label: "Activity Logs", icon: History, roles: ["tenant_super_admin", "admin"] },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["tenant_super_admin", "admin"] },
];

interface SidebarProps {
  user: { fullName: string; role: string; tenant?: { name: string } | null };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } flex-shrink-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        {!collapsed && (
          <div>
            <p className="font-bold text-sm text-white">InventoryPro</p>
            <p className="text-xs text-slate-400 truncate">{user.tenant?.name ?? "School OS"}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role.replace(/_/g, " ")}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-900/40 hover:text-red-400 transition-colors"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && (
          <p className="text-xs text-slate-600 px-2 mt-2">v1.0.0</p>
        )}
      </div>
    </aside>
  );
}
