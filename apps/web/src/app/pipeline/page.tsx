"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import type { Doc } from "@CRM-APP/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@CRM-APP/ui/components/avatar";
import { Badge } from "@CRM-APP/ui/components/badge";
import { Button, buttonVariants } from "@CRM-APP/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@CRM-APP/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@CRM-APP/ui/components/select";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@CRM-APP/ui/components/tabs";
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { AlertTriangle, Kanban, Table2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DealsTable } from "@/components/deals-table";
import { KanbanBoard } from "@/components/kanban-board";
import { NewDealDialog } from "@/components/new-deal-dialog";
import { formatDate, formatMontant, ownerColor, ownerInitials } from "@/lib/format";

type Stage = Doc<"deals">["stage"];

const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  qualifie: "Qualifié",
  proposition: "Proposition",
  nego: "Négo",
  signe: "Signé",
  perdu: "Perdu",
};

const STAGE_COLORS: Record<Stage, string> = {
  lead: "bg-slate-400",
  qualifie: "bg-sky-500",
  proposition: "bg-indigo-500",
  nego: "bg-amber-500",
  signe: "bg-emerald-500",
  perdu: "bg-rose-500",
};

const PERIODS = [
  { label: "7 j", value: 7 },
  { label: "30 j", value: 30 },
  { label: "90 j", value: 90 },
  { label: "365 j", value: 365 },
] as const;

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "table" ? "table" : "kanban";
  const [period, setPeriod] = useState<number>(30);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>(undefined);

  const filters = {
    owner_id: ownerId,
    tag_id: tagId as any,
    updated_since: Date.now() - period * 24 * 60 * 60 * 1000,
  };

  return (
    <AppShell
      title="Pipeline"
      actions={
        <div className="flex items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <NewDealDialog />
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <AuthLoading>
          <PipelinePageSkeleton view={view} />
        </AuthLoading>
        <Authenticated>
          <DashboardStats period={period} />
          <Toolbar
            view={view}
            ownerId={ownerId}
            tagId={tagId}
            onOwnerChange={setOwnerId}
            onTagChange={setTagId}
          />
          {view === "kanban" ? (
            <KanbanBoard filters={filters} />
          ) : (
            <DealsTable filters={filters} />
          )}
        </Authenticated>
        <Unauthenticated>
          <SignInPrompt />
        </Unauthenticated>
      </div>
    </AppShell>
  );
}

function DashboardStats({ period }: { period: number }) {
  const stats = useQuery(api.dashboard.getStats, { period_days: period });

  if (stats === undefined) return <DashboardStatsSkeleton />;

  return (
    <>
      <PipelineValueCard
        rows={stats.pipelineByStage}
        totalBrut={stats.totalBrut}
        totalPondere={stats.totalPondere}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityByOwnerCard rows={stats.activityByOwner} period={period} />
        <DealsAtRiskCard
          rows={stats.dealsAtRisk}
          totalCount={stats.totalRiskCount}
        />
      </div>
    </>
  );
}

function Toolbar({
  view,
  ownerId,
  tagId,
  onOwnerChange,
  onTagChange,
}: {
  view: "kanban" | "table";
  ownerId: string | undefined;
  tagId: string | undefined;
  onOwnerChange: (id: string | undefined) => void;
  onTagChange: (id: string | undefined) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs value={view}>
        <TabsList>
          <TabsTrigger value="kanban" onClick={() => router.push("/pipeline")}>
            <Kanban />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="table" onClick={() => router.push("/pipeline?view=table")}>
            <Table2 />
            Tableau
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Authenticated>
          <OwnerFilter value={ownerId} onChange={onOwnerChange} />
          <TagFilter value={tagId} onChange={onTagChange} />
        </Authenticated>
        {(ownerId || tagId) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOwnerChange(undefined);
              onTagChange(undefined);
            }}
          >
            <X data-icon="inline-start" />
            Effacer filtres
          </Button>
        )}
      </div>
    </div>
  );
}

function TagFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const tags = useQuery(api.tags.list, { scope: "deal" });
  if (!tags || tags.length === 0) return null;
  return (
    <Select value={value ?? "__all"} onValueChange={(next) => onChange(next === "__all" ? undefined : (next ?? undefined))}>
      <SelectTrigger size="sm" className="w-40 bg-background">
        <SelectValue placeholder="Tags" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="__all">Tous les tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag._id} value={tag._id}>
              {tag.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function OwnerFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const deals = useQuery(api.deals.listForKanban, {});

  if (!deals) return null;

  const ownerIds = Array.from(new Set(deals.map((d) => d.owner_id)));
  if (ownerIds.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Owner :</span>
      <div className="flex items-center gap-1">
        {ownerIds.map((id) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(value === id ? undefined : id)}
            className={cn(value !== id && "opacity-70")}
            title={id}
          >
            <Avatar size="sm" style={{ backgroundColor: ownerColor(id) }}>
              <AvatarFallback className="bg-transparent text-white">
                {ownerInitials(id)}
              </AvatarFallback>
            </Avatar>
          </Button>
        ))}
      </div>
    </div>
  );
}

type PipelineRow = {
  stage: Stage;
  count: number;
  total: number;
  pondere: number;
};

function PipelineValueCard({
  rows,
  totalBrut,
  totalPondere,
}: {
  rows: PipelineRow[];
  totalBrut: number;
  totalPondere: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valeur du pipeline par stage</CardTitle>
        <CardAction>
          <div className="text-xs text-muted-foreground">
            Total brut{" "}
            <span className="font-medium text-foreground">
              {formatMontant(totalBrut)}
            </span>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {rows.map((row) => {
          const pct = (row.total / max) * 100;
          return (
            <div
              key={row.stage}
              className="grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-[100px_1fr_120px] sm:gap-3"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={cn("size-2 rounded-full", STAGE_COLORS[row.stage])}
                />
                <span>{STAGE_LABELS[row.stage]}</span>
              </div>
              <div className="relative h-6 overflow-hidden rounded-sm bg-muted/40">
                <div
                  className={cn("h-full rounded-sm", STAGE_COLORS[row.stage])}
                  style={{ width: `${pct}%`, opacity: 0.8 }}
                />
                <span className="absolute left-2 top-0 flex h-full items-center text-xs text-muted-foreground">
                  {row.count} deal{row.count > 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-right font-medium tabular-nums">
                {formatMontant(row.total)}
              </div>
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="text-sm">
        <span className="text-muted-foreground">Pondéré (x proba) : </span>
        <span className="font-medium tabular-nums">
          {formatMontant(totalPondere)}
        </span>
      </CardFooter>
    </Card>
  );
}

type OwnerRow = {
  owner_id: string;
  rdv: number;
  dealsCreated: number;
  dealsWon: number;
};

function ActivityByOwnerCard({
  rows,
  period,
}: {
  rows: OwnerRow[];
  period: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.rdv));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité par commercial</CardTitle>
        <CardDescription>{period} j</CardDescription>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <EmptyHint>Aucune activité sur la période.</EmptyHint>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const pct = (row.rdv / max) * 100;
              return (
                <li key={row.owner_id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar size="sm" style={{ backgroundColor: ownerColor(row.owner_id) }}>
                      <AvatarFallback className="bg-transparent text-white">
                        {ownerInitials(row.owner_id)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-muted-foreground">
                      {row.owner_id.slice(0, 12)}...
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.rdv} RDV · {row.dealsCreated} créés · {row.dealsWon} gagnés
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ownerColor(row.owner_id),
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

type RiskyDeal = {
  _id: string;
  titre: string;
  stage: Stage;
  montant: number;
  devise: string;
  societe_nom: string;
  date_closing_prevue?: number;
  reason: string;
};

function DealsAtRiskCard({
  rows,
  totalCount,
}: {
  rows: RiskyDeal[];
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle />
          Deals à risque ({totalCount})
        </CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <EmptyHint>Aucun deal à risque.</EmptyHint>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((deal) => (
              <li
                key={deal._id}
                className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        STAGE_COLORS[deal.stage],
                      )}
                    />
                    <span className="truncate font-medium">{deal.titre}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {deal.societe_nom} · stage {STAGE_LABELS[deal.stage]}{" "}
                    <Badge variant="destructive">{deal.reason}</Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {formatMontant(deal.montant, deal.devise)}
                  </div>
                  {deal.date_closing_prevue ? (
                    <div className="tabular-nums">
                      closing {formatDate(deal.date_closing_prevue)}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="hidden sm:inline">Période :</span>
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger size="sm" className="w-24 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-background/40 p-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function PipelinePageSkeleton({ view }: { view: "kanban" | "table" }) {
  return (
    <>
      <DashboardStatsSkeleton />
      {view === "kanban" ? <BoardSkeleton /> : <TableSkeletonLoading />}
    </>
  );
}

function DashboardStatsSkeleton() {
  return (
    <>
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

function TableSkeletonLoading() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        Connectez-vous pour voir votre pipeline.
      </p>
      <Link href="/" className={buttonVariants({ size: "sm" })}>
        Se connecter
      </Link>
    </div>
  );
}
