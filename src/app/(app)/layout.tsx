import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import prisma from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, fullName: true, role: true, status: true,
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!user || user.status !== "active") redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={{ fullName: user.fullName, role: user.role, tenant: user.tenant }}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
