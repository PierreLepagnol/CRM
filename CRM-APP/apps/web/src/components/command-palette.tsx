"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Button } from "@CRM-APP/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@CRM-APP/ui/components/dialog";
import { Input } from "@CRM-APP/ui/components/input";
import { Separator } from "@CRM-APP/ui/components/separator";
import { useQuery } from "convex/react";
import { Building2, FileSignature, Kanban, NotebookText, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Global Cmd-K / Ctrl-K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ("");
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [q]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigate = (href: string) => {
    setOpen(false);
    router.push(href as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[25vh] max-w-lg p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche globale</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((idx) => idx + 1);
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((idx) => Math.max(0, idx - 1));
              }
            }}
            placeholder="Rechercher sociétés, contacts, deals…"
            className="h-7 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {q && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setQ("")}
              aria-label="Effacer la recherche"
            >
              <X />
            </Button>
          )}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          <SearchResults
            q={q}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onNavigate={navigate}
          />
        </div>

        <Separator />
        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
          ↑↓ naviguer · ↵ ouvrir · Échap fermer
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResults({
  q,
  activeIndex,
  onActiveIndexChange,
  onNavigate,
}: {
  q: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onNavigate: (href: string) => void;
}) {
  const trimmed = q.trim();

  const results = useQuery(api.search.global, trimmed ? { q: trimmed } : "skip");

  const flat = useMemo(() => {
    if (!results) return [];
    return [
      ...results.societes.map((item) => ({ ...item, group: "Sociétés", icon: <Building2 className="size-4" /> })),
      ...results.contacts.map((item) => ({ ...item, group: "Contacts", icon: <Users className="size-4" /> })),
      ...results.deals.map((item) => ({ ...item, group: "Deals", icon: <Kanban className="size-4" /> })),
      ...results.contrats.map((item) => ({ ...item, group: "Contrats", icon: <FileSignature className="size-4" /> })),
      ...results.notes.map((item) => ({ ...item, group: "Notes", icon: <NotebookText className="size-4" /> })),
    ];
  }, [results]);
  const boundedActiveIndex = flat.length > 0 ? activeIndex % flat.length : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!trimmed || flat.length === 0) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onNavigate(flat[boundedActiveIndex].href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [boundedActiveIndex, flat, onNavigate, trimmed]);

  if (!trimmed) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        Tapez pour rechercher…
      </div>
    );
  }

  if (results === undefined) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        Recherche…
      </div>
    );
  }

  const isEmpty = flat.length === 0;
  if (isEmpty) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        Aucun résultat pour « {trimmed} »
      </div>
    );
  }

  return (
    <>
      {["Sociétés", "Contacts", "Deals", "Contrats", "Notes"].map((group) => {
        const items = flat.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <ResultGroup key={group} label={group}>
            {items.map((item) => {
              const idx = flat.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label);
              return (
                <ResultItem
                  key={`${group}-${item._id}-${item.href}`}
                  icon={item.icon}
                  primary={item.label}
                  secondary={item.detail}
                  active={idx === boundedActiveIndex}
                  onMouseEnter={() => onActiveIndexChange(idx)}
                  onClick={() => onNavigate(item.href)}
                />
              );
            })}
          </ResultGroup>
        );
      })}
    </>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  icon,
  primary,
  secondary,
  active,
  onMouseEnter,
  onClick,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  active?: boolean;
  onMouseEnter?: () => void;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className="h-auto w-full justify-start gap-3 rounded-none px-4 py-2 text-left"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 font-medium">{primary}</span>
      {secondary && (
        <span className="shrink-0 text-xs text-muted-foreground">{secondary}</span>
      )}
    </Button>
  );
}
