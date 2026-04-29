import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const STAGES = [
  "lead",
  "qualifie",
  "proposition",
  "nego",
  "signe",
  "perdu",
] as const satisfies ReadonlyArray<Doc<"deals">["stage"]>;

const INACTIVITY_DAYS = 30;

/**
 * Statistiques agrégées pour le Dashboard (cf. WIREFRAMES §9).
 *
 * Renvoie en un seul appel :
 *   - Pipeline value par stage (montant brut + pondéré × proba)
 *   - Activité par commercial sur la période (RDV, deals créés, deals gagnés)
 *   - Liste des deals à risque (closing dépassé OU inactivité > 30j)
 *
 * Bornes : on prend au plus 2 000 deals et 2 000 réunions, suffisant pour le
 * volume cible (petite équipe, cf. DECISIONS §F1).
 */
export const getStats = query({
  args: { period_days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);

    const periodDays = args.period_days ?? 30;
    const now = Date.now();
    const since = now - periodDays * DAY_MS;
    const inactivityThreshold = now - INACTIVITY_DAYS * DAY_MS;

    const deals = (await ctx.db.query("deals").take(2000)).filter(
      (deal) => deal.deleted_at === undefined,
    );

    const pipelineByStage = STAGES.map((stage) => {
      const items = deals.filter((d) => d.stage === stage);
      const total = items.reduce((acc, d) => acc + d.montant, 0);
      const pondere = items.reduce(
        (acc, d) => acc + d.montant * (d.probabilite / 100),
        0,
      );
      return { stage, count: items.length, total, pondere };
    });
    const totalPondere = pipelineByStage.reduce((acc, s) => acc + s.pondere, 0);
    const totalBrut = pipelineByStage.reduce((acc, s) => acc + s.total, 0);

    const reunions = (
      await ctx.db
      .query("reunions")
      .withIndex("by_date", (q) => q.gte("date", since))
      .take(2000)
    ).filter((reunion) => reunion.deleted_at === undefined);

    const byOwner = new Map<
      string,
      { owner_id: string; rdv: number; dealsCreated: number; dealsWon: number }
    >();
    const bump = (id: string) => {
      let entry = byOwner.get(id);
      if (!entry) {
        entry = { owner_id: id, rdv: 0, dealsCreated: 0, dealsWon: 0 };
        byOwner.set(id, entry);
      }
      return entry;
    };

    for (const r of reunions) bump(r.created_by).rdv += 1;
    for (const d of deals) {
      if (d._creationTime >= since) bump(d.owner_id).dealsCreated += 1;
      if (d.stage === "signe" && d.closed_at && d.closed_at >= since) {
        bump(d.owner_id).dealsWon += 1;
      }
    }
    const activityByOwner = Array.from(byOwner.values()).sort(
      (a, b) => b.rdv + b.dealsWon - (a.rdv + a.dealsWon),
    );

    const risky = deals.filter((d) => {
      if (d.stage === "signe" || d.stage === "perdu") return false;
      const closingPast =
        d.date_closing_prevue !== undefined && d.date_closing_prevue < now;
      const inactive = d.updated_at < inactivityThreshold;
      return closingPast || inactive;
    });

    const societeIds = Array.from(new Set(risky.map((d) => d.societe_id)));
    const societes = await Promise.all(societeIds.map((id) => ctx.db.get(id)));
    const nomById = new Map<Id<"societes">, string>();
    for (const s of societes) {
      if (s && s.deleted_at === undefined) nomById.set(s._id, s.nom);
    }

    const dealsAtRisk = risky
      .map((d) => {
        const closingPast =
          d.date_closing_prevue !== undefined && d.date_closing_prevue < now;
        const closingDelta = closingPast
          ? Math.floor((now - (d.date_closing_prevue as number)) / DAY_MS)
          : null;
        const inactiveDays = Math.floor((now - d.updated_at) / DAY_MS);
        const reason = closingPast
          ? `closing dépassé (-${closingDelta}j)`
          : `inactif depuis ${inactiveDays}j`;
        return {
          _id: d._id,
          titre: d.titre,
          stage: d.stage,
          montant: d.montant,
          devise: d.devise,
          owner_id: d.owner_id,
          societe_nom: nomById.get(d.societe_id) ?? "—",
          date_closing_prevue: d.date_closing_prevue,
          updated_at: d.updated_at,
          reason,
        };
      })
      .sort((a, b) => a.updated_at - b.updated_at)
      .slice(0, 20);

    return {
      periodDays,
      generatedAt: now,
      pipelineByStage,
      totalBrut,
      totalPondere,
      activityByOwner,
      dealsAtRisk,
      totalRiskCount: risky.length,
    };
  },
});
