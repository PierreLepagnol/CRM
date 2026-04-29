"use client";

import { Button } from "@CRM-APP/ui/components/button";
import { cn } from "@CRM-APP/ui/lib/utils";
import {
  Building2,
  CalendarCheck2,
  FileSignature,
  Flame,
  Kanban,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/aujourdhui", label: "Aujourd'hui", icon: Flame },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/societes", label: "Sociétés", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/reunions", label: "Réunions", icon: CalendarCheck2 },
  { href: "/contrats", label: "Contrats", icon: FileSignature },
  { href: "/reglages", label: "Réglages", icon: Settings },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Ouvrir le menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-background">
            <div className="flex h-14 items-center justify-between px-4 font-semibold">
              CRM
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-2">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
