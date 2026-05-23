import { isAdminAuthorized } from "@/lib/editorial-dashboard/auth";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";

type AdminPageGateProps = {
  searchParams: Promise<{ key?: string }>;
  children: React.ReactNode;
};

export async function AdminPageGate({ searchParams, children }: AdminPageGateProps) {
  const { key } = await searchParams;

  if (!isAdminAuthorized(key)) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Open any admin page with{" "}
          <code className="text-amber-400">?key=ADMIN_SECRET</code> (set{" "}
          <code className="text-amber-400">ADMIN_SECRET</code> in env).
        </p>
        <ul className="mt-4 text-sm text-neutral-500 list-disc pl-5">
          <li>/admin/editorial</li>
          <li>/admin/stories</li>
          <li>/admin/live-wire</li>
          <li>/admin/images</li>
          <li>/admin/analytics</li>
        </ul>
      </main>
    );
  }

  return <AdminProvider adminKey={key!}>{children}</AdminProvider>;
}
