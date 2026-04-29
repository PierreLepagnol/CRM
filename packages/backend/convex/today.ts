import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVITY_DAYS = 30;
const RECENT_DAYS = 7;

type EntityRef =
  | { kind: "societe"; id: Id<"societes"> }
  | { kind: "contact"; id: Id<"contacts"> }
  | { kind: "deal"; id: Id<"deals"> };

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function isActiveDeal(deal: Doc<"deals">) {
  return deal.deleted_at === undefined && deal.stage !== "signe" && deal.stage !== "perdu";
}

async function resolveEntityLabel(ctx: QueryCtx, entity: EntityRef) {
  if (entity.kind === "societe") {
    const societe = await ctx.db.get(entity.id);
    return societe && societe.deleted_at === undefined ? societe.nom : "Société supprimée";
  }
  if (entity.kind === "contact") {
    const contact = await ctx.db.get(entity.id);
    return contact && contact.deleted_at === undefined
      ? `${contact.prenom} ${contact.nom}`
      : "Contact supprimé";
  }
  const deal = await ctx.db.get(entity.id);
  return deal && deal.deleted_at === undefined ? deal.titre : "Deal supprimé";
}

function entityHref(entity: EntityRef) {
  if (entity.kind === "societe") return `/societes/${entity.id}`;
  if (entity.kind === "contact") return `/contacts/${entity.id}`;
  return "/pipeline";
}

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const inactivityThreshold = now - INACTIVITY_DAYS * DAY_MS;
    const recentThreshold = now - RECENT_DAYS * DAY_MS;

    const deals = (
      await ctx.db.query("deals").withIndex("by_updated_at").order("desc").take(1000)
    ).filter((deal) => deal.deleted_at === undefined);
    const activeDeals = deals.filter(isActiveDeal);

    const closingPast = activeDeals
      .filter((deal) => deal.date_closing_prevue !== undefined && deal.date_closing_prevue < todayStart)
      .sort((a, b) => (a.date_closing_prevue ?? 0) - (b.date_closing_prevue ?? 0))
      .slice(0, 12);

    const inactive = activeDeals
      .filter((deal) => deal.updated_at < inactivityThreshold)
      .sort((a, b) => a.updated_at - b.updated_at)
      .slice(0, 12);

    const noNextSignal = activeDeals
      .filter((deal) => deal.date_closing_prevue === undefined && deal.updated_at < now - 7 * DAY_MS)
      .sort((a, b) => a.updated_at - b.updated_at)
      .slice(0, 12);

    const societesById = new Map<Id<"societes">, Doc<"societes"> | null>();
    const ensureSociete = async (id: Id<"societes">) => {
      if (!societesById.has(id)) societesById.set(id, await ctx.db.get(id));
      return societesById.get(id);
    };

    const toDealAction = async (
      deal: Doc<"deals">,
      kind: "closing_past" | "inactive" | "no_next_signal",
    ) => {
      const societe = await ensureSociete(deal.societe_id);
      const daysLate =
        kind === "closing_past" && deal.date_closing_prevue
          ? Math.max(1, Math.floor((now - deal.date_closing_prevue) / DAY_MS))
          : Math.max(1, Math.floor((now - deal.updated_at) / DAY_MS));
      return {
        id: `${kind}:${deal._id}`,
        kind,
        title: deal.titre,
        subtitle:
          societe && societe.deleted_at === undefined ? societe.nom : "Société supprimée",
        href: "/pipeline",
        stage: deal.stage,
        owner_id: deal.owner_id,
        amount: deal.montant,
        currency: deal.devise,
        due_at: deal.date_closing_prevue,
        updated_at: deal.updated_at,
        daysLate,
      };
    };

    const [closingPastActions, inactiveActions, noNextSignalActions] = await Promise.all([
      Promise.all(closingPast.map((deal) => toDealAction(deal, "closing_past"))),
      Promise.all(inactive.map((deal) => toDealAction(deal, "inactive"))),
      Promise.all(noNextSignal.map((deal) => toDealAction(deal, "no_next_signal"))),
    ]);

    const reunionsToday = (
      await ctx.db
      .query("reunions")
      .withIndex("by_date", (q) => q.gte("date", todayStart).lte("date", todayEnd))
      .take(100)
    ).filter((reunion) => reunion.deleted_at === undefined);

    const meetings = await Promise.all(
      reunionsToday.map(async (reunion) => ({
        id: reunion._id,
        title: await resolveEntityLabel(ctx, reunion.attached_to),
        subtitle: reunion.lieu_ou_url ?? "Réunion",
        href: entityHref(reunion.attached_to),
        starts_at: reunion.date,
        duration_minutes: reunion.duree_minutes,
        next_steps_count: reunion.next_steps.filter((step) => !step.done).length,
      })),
    );

    const recentReunions = (
      await ctx.db
      .query("reunions")
      .withIndex("by_date", (q) => q.gte("date", now - 90 * DAY_MS).lte("date", todayEnd))
      .take(500)
    ).filter((reunion) => reunion.deleted_at === undefined);

    const dueTasks = (
      await ctx.db
        .query("tasks")
        .withIndex("by_due_status", (q) => q.eq("status", "open").lte("due_at", todayEnd))
        .take(100)
    ).filter((task) => task.deleted_at === undefined && task.due_at !== undefined);

    const taskSourceKeys = new Set(
      dueTasks
        .filter(
          (task) =>
            task.source_reunion_id !== undefined && task.source_next_step_index !== undefined,
        )
        .map((task) => `${task.source_reunion_id}:${task.source_next_step_index}`),
    );

    const dueNextStepsFromTasks = await Promise.all(
      dueTasks.map(async (task) => ({
        id: `task:${task._id}`,
        title: task.title,
        subtitle: await resolveEntityLabel(ctx, task.entity),
        href: entityHref(task.entity),
        due_at: task.due_at as number,
        owner_id: task.owner_id ?? task.created_by,
        overdue: (task.due_at as number) < todayStart,
      })),
    );

    const dueNextStepsFromMeetings = (
      await Promise.all(
        recentReunions.flatMap((reunion) =>
          reunion.next_steps.map(async (step, index) => {
            if (step.done || step.due_date === undefined || step.due_date > todayEnd) return null;
            if (taskSourceKeys.has(`${reunion._id}:${index}`)) return null;
            return {
              id: `${reunion._id}:${index}`,
              title: step.description,
              subtitle: await resolveEntityLabel(ctx, reunion.attached_to),
              href: entityHref(reunion.attached_to),
              due_at: step.due_date,
              owner_id: step.owner_id ?? reunion.created_by,
              overdue: step.due_date < todayStart,
            };
          }),
        ),
      )
    )
      .filter((step) => step !== null);

    const dueNextSteps = [...dueNextStepsFromTasks, ...dueNextStepsFromMeetings]
      .sort((a, b) => a.due_at - b.due_at)
      .slice(0, 20);

    const recentContacts = (
      await ctx.db.query("contacts").withIndex("by_updated_at").order("desc").take(100)
    )
      .filter((contact) => contact.deleted_at === undefined && contact._creationTime >= recentThreshold)
      .slice(0, 8);
    const recentSocietes = (
      await ctx.db.query("societes").withIndex("by_updated_at").order("desc").take(100)
    )
      .filter((societe) => societe.deleted_at === undefined && societe._creationTime >= recentThreshold)
      .slice(0, 8);

    const qualification = [
      ...recentContacts.map((contact) => ({
        id: `contact:${contact._id}`,
        kind: "contact" as const,
        title: `${contact.prenom} ${contact.nom}`,
        subtitle: contact.email ?? "Contact récent",
        href: `/contacts/${contact._id}`,
        updated_at: contact.updated_at,
      })),
      ...recentSocietes.map((societe) => ({
        id: `societe:${societe._id}`,
        kind: "societe" as const,
        title: societe.nom,
        subtitle: societe.ville ?? "Société récente",
        href: `/societes/${societe._id}`,
        updated_at: societe.updated_at,
      })),
    ]
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, 12);

    return {
      generatedAt: now,
      ownerId: userId,
      counts: {
        dueNextSteps: dueNextSteps.length,
        meetings: meetings.length,
        closingPast: closingPastActions.length,
        inactive: inactiveActions.length,
        noNextSignal: noNextSignalActions.length,
        qualification: qualification.length,
      },
      dueNextSteps,
      meetings: meetings.sort((a, b) => a.starts_at - b.starts_at),
      closingPast: closingPastActions,
      inactive: inactiveActions,
      noNextSignal: noNextSignalActions,
      qualification,
    };
  },
});
