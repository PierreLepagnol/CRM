"use client";

import { Authenticated } from "convex/react";

import { AppShell } from "@/components/app-shell";
import { ContactKanban } from "@/components/contact-kanban";
import { NewContactDialog } from "@/components/new-contact-dialog";

export default function PipelinePage() {
  return (
    <AppShell title="Pipeline" actions={<NewContactDialog />}>
      <div className="flex flex-col gap-4 p-4">
        <Authenticated>
          <ContactKanban />
        </Authenticated>
      </div>
    </AppShell>
  );
}
