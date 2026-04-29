"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Button } from "@CRM-APP/ui/components/button";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { LogReunionDialog } from "@/components/log-reunion-dialog";
import { formatDate } from "@/lib/format";

export default function ReunionsPage() {
  return (
    <AppShell title="Réunions" actions={<LogReunionDialog />}>
      <AuthLoading><PageSkeleton /></AuthLoading>
      <Authenticated><ReunionsList /></Authenticated>
      <Unauthenticated>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Connectez-vous pour voir les réunions.
        </p>
      </Unauthenticated>
    </AppShell>
  );
}

function ReunionsList() {
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const from = target.getTime();
  const to = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59).getTime();

  const reunions = useQuery(api.reunions.listByDateRange, { from, to });

  const monthLabel = target.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Navigation mois */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-medium capitalize">{monthLabel}</h2>
        <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {reunions === undefined ? (
        <PageSkeleton />
      ) : reunions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune réunion en {monthLabel}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reunions.map((r) => (
            <ReunionCard key={r._id} reunion={r} />
          ))}
        </div>
      )}

      {monthOffset !== 0 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Revenir au mois courant
          </button>
        </div>
      )}
    </div>
  );
}

function ReunionCard({ reunion }: { reunion: Doc<"reunions"> }) {
  const [expanded, setExpanded] = useState(false);
  const toggleNextStep = useMutation(api.reunions.toggleNextStep);

  const dateStr = new Date(reunion.date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const timeStr = new Date(reunion.date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-4 px-4 py-3 text-left"
      >
        <div className="flex shrink-0 flex-col items-center rounded-md bg-muted px-2.5 py-1.5 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">{dateStr.split(" ")[0]}</span>
          <span className="text-base font-bold leading-tight">{dateStr.split(" ")[1]}</span>
          <span className="text-[10px] text-muted-foreground">{dateStr.split(" ").slice(2).join(" ")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {timeStr !== "00:00" ? timeStr : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {reunion.duree_minutes} min
            </span>
          </div>
          {reunion.lieu_ou_url && (
            <div className="truncate text-xs text-muted-foreground">{reunion.lieu_ou_url}</div>
          )}
          {reunion.next_steps.length > 0 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {reunion.next_steps.filter((s) => !s.done).length} action(s) en attente
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          {reunion.compte_rendu_md ? (
            <div className="mb-3">
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Compte-rendu</h4>
              <pre className="whitespace-pre-wrap text-sm">{reunion.compte_rendu_md}</pre>
            </div>
          ) : null}
          {reunion.next_steps.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Next steps</h4>
              <ul className="flex flex-col gap-1.5">
                {reunion.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => toggleNextStep({ id: reunion._id, index: i, done: !step.done })}
                      className={`mt-0.5 size-3.5 shrink-0 rounded-sm border ${step.done ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                      aria-label={step.done ? "Marquer à faire" : "Marquer fait"}
                    />
                    <span className={step.done ? "line-through text-muted-foreground" : ""}>
                      {step.description}
                    </span>
                    {step.due_date && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatDate(step.due_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
