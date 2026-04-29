"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@CRM-APP/ui/components/button";
import { Separator } from "@CRM-APP/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@CRM-APP/ui/components/sidebar";
import { Search } from "lucide-react";

import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { CsvImportDialog } from "./csv-import-dialog";
import { ModeToggle } from "./mode-toggle";

type AppShellProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, actions, children }: AppShellProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files).find(
      (file) => file.name.endsWith(".csv") || file.type === "text/csv",
    );
    if (f) { setCsvFile(f); setCsvOpen(true); }
  }, []);

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset
        className="overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <CommandPalette />
        <CsvImportDialog
          open={csvOpen}
          onClose={() => { setCsvOpen(false); setCsvFile(null); }}
          file={csvFile ?? undefined}
        />

        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <h1 className="text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <SearchButton />
            <ModeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SearchButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
        );
      }}
      aria-label="Recherche globale"
    >
      <Search data-icon="inline-start" />
      <kbd className="hidden sm:inline">⌘K</kbd>
    </Button>
  );
}
