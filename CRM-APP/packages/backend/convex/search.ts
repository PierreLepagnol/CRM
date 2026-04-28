import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const LIMIT = 8;

function includes(haystack: string | undefined, needle: string) {
  return (haystack ?? "").toLocaleLowerCase("fr-FR").includes(needle);
}

export const global = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const needle = args.q.trim().toLocaleLowerCase("fr-FR");
    if (!needle) {
      return { societes: [], contacts: [], deals: [], contrats: [], notes: [] };
    }

    const [societesRaw, contactsRaw, dealsRaw, contratsRaw, reunionsRaw] = await Promise.all([
      ctx.db.query("societes").withIndex("by_updated_at").order("desc").take(500),
      ctx.db.query("contacts").withIndex("by_updated_at").order("desc").take(500),
      ctx.db.query("deals").withIndex("by_updated_at").order("desc").take(500),
      ctx.db.query("contrats").take(500),
      ctx.db.query("reunions").withIndex("by_date").order("desc").take(500),
    ]);
    const societes = societesRaw.filter((row) => row.deleted_at === undefined);
    const contacts = contactsRaw.filter((row) => row.deleted_at === undefined);
    const deals = dealsRaw.filter((row) => row.deleted_at === undefined);
    const contrats = contratsRaw.filter((row) => row.deleted_at === undefined);
    const reunions = reunionsRaw.filter((row) => row.deleted_at === undefined);

    const societeNames = new Map(societes.map((s) => [s._id, s.nom]));
    const dealTitles = new Map(deals.map((d) => [d._id, d.titre]));

    return {
      societes: societes
        .filter((s) =>
          [s.nom, s.siret, s.ville, s.secteur, s.notes_md].some((field) =>
            includes(field, needle),
          ),
        )
        .slice(0, LIMIT)
        .map((s) => ({
          _id: s._id,
          label: s.nom,
          detail: [s.ville, s.secteur].filter(Boolean).join(" · "),
          href: `/societes/${s._id}`,
        })),
      contacts: contacts
        .filter((c) =>
          [
            `${c.prenom} ${c.nom}`,
            c.email,
            c.intitule_poste,
            c.linkedin_url,
            c.notes_md,
          ].some((field) => includes(field, needle)),
        )
        .slice(0, LIMIT)
        .map((c) => ({
          _id: c._id,
          label: `${c.prenom} ${c.nom}`,
          detail: [c.intitule_poste, c.societe_id ? societeNames.get(c.societe_id) : null]
            .filter(Boolean)
            .join(" · "),
          href: `/contacts/${c._id}`,
        })),
      deals: deals
        .filter((d) => [d.titre, d.notes_md, d.stage].some((field) => includes(field, needle)))
        .slice(0, LIMIT)
        .map((d) => ({
          _id: d._id,
          label: d.titre,
          detail: [societeNames.get(d.societe_id), d.stage].filter(Boolean).join(" · "),
          href: `/pipeline?deal=${d._id}`,
        })),
      contrats: contrats
        .filter((c) => {
          const societe = societeNames.get(c.societe_id);
          const deal = dealTitles.get(c.deal_id);
          return [societe, deal, c.statut, c.frequence_facturation].some((field) =>
            includes(field, needle),
          );
        })
        .slice(0, LIMIT)
        .map((c) => ({
          _id: c._id,
          label: societeNames.get(c.societe_id) ?? "Contrat",
          detail: [dealTitles.get(c.deal_id), c.statut].filter(Boolean).join(" · "),
          href: `/contrats/${c._id}`,
        })),
      notes: [
        ...societes
          .filter((s) => includes(s.notes_md, needle))
          .map((s) => ({
            _id: s._id,
            label: `Note société · ${s.nom}`,
            detail: s.notes_md?.slice(0, 90) ?? "",
            href: `/societes/${s._id}`,
          })),
        ...contacts
          .filter((c) => includes(c.notes_md, needle))
          .map((c) => ({
            _id: c._id,
            label: `Note contact · ${c.prenom} ${c.nom}`,
            detail: c.notes_md?.slice(0, 90) ?? "",
            href: `/contacts/${c._id}`,
          })),
        ...deals
          .filter((d) => includes(d.notes_md, needle))
          .map((d) => ({
            _id: d._id,
            label: `Note deal · ${d.titre}`,
            detail: d.notes_md?.slice(0, 90) ?? "",
            href: `/pipeline?deal=${d._id}`,
          })),
        ...reunions
          .filter((r) => includes(r.compte_rendu_md, needle))
          .map((r) => ({
            _id: r._id,
            label: "Compte-rendu réunion",
            detail: r.compte_rendu_md?.slice(0, 90) ?? "",
            href:
              r.attached_to.kind === "societe"
                ? `/societes/${r.attached_to.id}`
                : r.attached_to.kind === "contact"
                  ? `/contacts/${r.attached_to.id}`
                  : `/pipeline?deal=${r.attached_to.id}`,
          })),
      ].slice(0, LIMIT),
    };
  },
});
