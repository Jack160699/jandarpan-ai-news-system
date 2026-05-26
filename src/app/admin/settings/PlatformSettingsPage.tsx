"use client";

import { useState } from "react";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformSettingsDashboard } from "@/components/admin-newsroom/PlatformSettingsDashboard";

export function PlatformSettingsPage() {
  const [search, setSearch] = useState("");

  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Platform settings"
        subtitle="AI newsroom operating system — modules, pipelines, and infrastructure."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search modules, AI systems, pipelines…"
      >
        <PlatformSettingsDashboard
          searchQuery={search}
          onSearchQueryChange={setSearch}
        />
      </AdminShell>
    </AdminPageGate>
  );
}
