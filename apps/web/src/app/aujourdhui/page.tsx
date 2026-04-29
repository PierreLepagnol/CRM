"use client";

import { api } from "@CRM-APP/backend/convex/_generated/api";
import { Badge } from "@CRM-APP/ui/components/badge";
import { buttonVariants } from "@CRM-APP/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@CRM-APP/ui/components/card";
import { Skeleton } from "@CRM-APP/ui/components/skeleton";
import { cn } from "@CRM-APP/ui/lib/utils";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  type LucideIcon,
  ListChecks,
  SearchCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { formatDate, formatMontant } from "@/lib/format";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualifie: "Qualifié",
  proposition: "Proposition",
  nego: "Négo",
  signe: "Signé",
  perdu: "Perdu",
};

type DealAction = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  stage: string;
  amount: number;
  currency: string;
  due_at?: number;
  updated_at: number;
  daysLate: number;
};

type NextStepAction = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  due_at: number;
  owner_id: string;
  overdue: boolean;
};

type MeetingAction = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  starts_at: number;
  duration_minutes: number;
  next_steps_count: number;
};

type QualificationAction = {
  id: string;
  kind: "contact" | "societe";
  title: string;
  subtitle: string;
  href: string;
  updated_at: number;
};

export default function AujourdHuiPage() {
  return (
    <AppShell title="Aujourd'hui">
      <div className="flex flex-col gap-4 p-4">
        <AuthLoading>
          <TodaySkeleton />
        </AuthLoading>
        <Authenticated>
          <TodayContent />
        </Authenticated>
        <Unauthenticated>
          <SignInPrompt />
        </Unauthenticated>
      </div>
    </AppShell>
  );
}

function TodayContent() {
  const overview = useQuery(api.today.getOverview, {});

  if (overview === undefined) return <TodaySkeleton />;

  const totalActions =
    overview.counts.dueNextSteps +
    overview.counts.meetings +
    overview.counts.closingPast +
    overview.counts.inactive +
    overview.counts.noNextSignal +
    overview.counts.qualification;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Actions" value={totalActions} />
        <Kpi label="Next steps" value={overview.counts.dueNextSteps} />
        <Kpi label="Réunions" value={overview.counts.meetings} />
        <Kpi label="Closings" value={overview.counts.closingPast} tone="risk" />
        <Kpi label="Inactifs" value={overview.counts.inactive} tone="risk" />
        <Kpi label="À qualifier" value={overview.counts.qualification} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <NextStepsCard items={overview.dueNextSteps} />
        <MeetingsCard items={overview.meetings} />
        <DealSection
          title="Closings dépassés"
          description="Deals actifs avec une date de closing passée."
          icon={AlertTriangle}
          items={overview.closingPast}
          empty="Aucun closing dépassé."
          variant="destructive"
        />
        <DealSection
          title="Deals inactifs"
          description="Deals actifs sans mise à jour depuis plus de 30 jours."
          icon={Clock3}
          items={overview.inactive}
          empty="Aucun deal inactif."
          variant="secondary"
        />
        <DealSection
          title="Sans signal de prochaine action"
          description="Deals actifs sans closing prévu et sans mise à jour récente."
          icon={ListChecks}
          items={overview.noNextSignal}
          empty="Tous les deals actifs ont un signal exploitable."
          variant="outline"
        />
        <QualificationCard items={overview.qualification} />
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "risk";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "risk" && value > 0 && "text-destructive",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function NextStepsCard({ items }: { items: NextStepAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 />
          Next steps à traiter
        </CardTitle>
        <CardDescription>Échéances issues des réunions.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>Aucun next step dû aujourd'hui ou en retard.</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <ActionLink href={item.href}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{item.subtitle}</span>
                      <Badge variant={item.overdue ? "destructive" : "secondary"}>
                        {item.overdue ? "En retard" : "Aujourd'hui"} · {formatDate(item.due_at)}
                      </Badge>
                    </div>
                  </div>
                </ActionLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MeetingsCard({ items }: { items: MeetingAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock />
          Réunions du jour
        </CardTitle>
        <CardDescription>Rendez-vous et points à préparer.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>Aucune réunion prévue aujourd'hui.</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <ActionLink href={item.href}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatTime(item.starts_at)}
                      </span>
                      <span className="truncate text-sm">{item.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.subtitle} · {item.duration_minutes} min
                      {item.next_steps_count > 0 ? ` · ${item.next_steps_count} next step(s)` : ""}
                    </div>
                  </div>
                </ActionLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DealSection({
  title,
  description,
  icon: Icon,
  items,
  empty,
  variant,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  items: DealAction[];
  empty: string;
  variant: "destructive" | "secondary" | "outline";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>{empty}</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <ActionLink href={item.href}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      <Badge variant={variant}>{STAGE_LABELS[item.stage] ?? item.stage}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{item.subtitle}</span>
                      <span>{formatMontant(item.amount, item.currency)}</span>
                      <span>{item.daysLate} j</span>
                    </div>
                  </div>
                </ActionLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QualificationCard({ items }: { items: QualificationAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchCheck />
          Nouveaux à qualifier
        </CardTitle>
        <CardDescription>Contacts et sociétés créés récemment.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>Aucun nouvel élément à qualifier.</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <ActionLink href={item.href}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      <Badge variant="secondary">
                        {item.kind === "contact" ? "Contact" : "Société"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.subtitle}
                    </div>
                  </div>
                </ActionLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActionLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href as any}
      className="flex items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/60"
    >
      {children}
      <ArrowRight className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-background/40 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    </>
  );
}

function SignInPrompt() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Flame />
      <p className="text-sm text-muted-foreground">
        Connectez-vous pour voir les actions du jour.
      </p>
      <Link href="/" className={buttonVariants({ size: "sm" })}>
        Se connecter
      </Link>
    </div>
  );
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}
