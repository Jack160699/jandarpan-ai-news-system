"use client";

import { useState } from "react";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { Av3SettingsDashboard } from "@/components/admin-newsroom/Av3SettingsDashboard";

export function PlatformSettingsPage() {
  const [search, setSearch] = useState("");

  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Platform settings"
        subtitle="Configuration for modules, languages, editorial rules, and integrations."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search settings…"
      >
        <Av3SettingsDashboard searchQuery={search} />
      </AdminShell>
    </AdminPageGate>
  );
}
