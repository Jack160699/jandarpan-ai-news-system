import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { SchemaHealthPanel } from "@/sections/admin/SchemaHealthPanel";

export const dynamic = "force-dynamic";

export default function AdminSchemaPage() {
  return (
    <AdminPageGate superAdminOnly>
      <SchemaHealthPanel />
    </AdminPageGate>
  );
}
