"use client";

import type { ReactNode } from "react";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Separator } from "@CRM-APP/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@CRM-APP/ui/components/sidebar";
import { useConvexAuth, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import Link from "next/link";

import { AppSidebar } from "./app-sidebar";
import { ModeToggle } from "./mode-toggle";

type AppShellProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, actions, children }: AppShellProps) {
  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
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
            <ModeToggle />
          </div>
        </header>

        <RelanceAlertBar />

        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function RelanceAlertBar() {
  const { isAuthenticated } = useConvexAuth();
  const dues = useQuery(api.contacts.listDueRelances, isAuthenticated ? {} : "skip");

  if (!dues || dues.length === 0) return null;

  const names = dues
    .slice(0, 3)
    .map((c) => `${c.prenom} ${c.nom}`)
    .join(", ");
  const extra = dues.length > 3 ? ` +${dues.length - 3}` : "";

  return (
    <Link
      href="/pipeline"
      className="flex items-center gap-2 border-b bg-orange-50 px-4 py-2 text-sm text-orange-800 transition-colors hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50"
    >
      <Bell className="size-4 shrink-0" />
      <span>
        <strong>{dues.length} relance{dues.length > 1 ? "s" : ""} à faire</strong>
        {" — "}
        {names}{extra}
      </span>
    </Link>
  );
}
