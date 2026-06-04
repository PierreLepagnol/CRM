"use client";

import { Authenticated } from "convex/react";

import { AppShell } from "@/components/app-shell";
import { ImportWizard } from "@/components/import/import-wizard";

export default function ContactsImportPage() {
  return (
    <AppShell title="Importer des contacts" pageKey="contacts">
      <Authenticated>
        <ImportWizard />
      </Authenticated>
    </AppShell>
  );
}
