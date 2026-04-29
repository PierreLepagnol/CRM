import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

export const allData = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const [societes, contacts, deals, contrats, reunions, tags, activity_events] =
      await Promise.all([
        ctx.db.query("societes").take(5000),
        ctx.db.query("contacts").take(5000),
        ctx.db.query("deals").take(5000),
        ctx.db.query("contrats").take(5000),
        ctx.db.query("reunions").take(5000),
        ctx.db.query("tags").take(5000),
        ctx.db.query("activity_events").take(10000),
      ]);

    return {
      exported_at: Date.now(),
      version: 1,
      societes,
      contacts,
      deals,
      contrats,
      reunions,
      tags,
      activity_events,
    };
  },
});

export const tables = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const [societes, contacts, deals, contrats, reunions, tags] = await Promise.all([
      ctx.db.query("societes").withIndex("by_updated_at").order("desc").take(5000),
      ctx.db.query("contacts").withIndex("by_updated_at").order("desc").take(5000),
      ctx.db.query("deals").withIndex("by_updated_at").order("desc").take(5000),
      ctx.db.query("contrats").take(5000),
      ctx.db.query("reunions").withIndex("by_date").order("desc").take(5000),
      ctx.db.query("tags").withIndex("by_label").order("asc").take(5000),
    ]);

    const societeById = new Map(societes.map((s) => [s._id, s]));
    const dealById = new Map(deals.map((d) => [d._id, d]));
    const tagsById = new Map(tags.map((t) => [t._id, t]));
    const contactById = new Map(contacts.map((c) => [c._id, c]));

    const tagLabels = (ids: string[]) =>
      ids.map((id) => tagsById.get(id as never)?.label).filter(Boolean).join(", ");

    return {
      societes: societes.map((s) => ({
        id: s._id,
        nom: s.nom,
        siret: s.siret ?? "",
        forme_juridique: s.forme_juridique ?? "",
        site_web: s.site_web ?? "",
        adresse: s.adresse ?? "",
        ville: s.ville ?? "",
        code_postal: s.code_postal ?? "",
        pays: s.pays ?? "",
        secteur: s.secteur ?? "",
        effectif: s.effectif ?? "",
        ca_estime: s.ca_estime ?? "",
        tags: tagLabels(s.tags),
        notes: s.notes_md ?? "",
        updated_at: s.updated_at,
      })),
      contacts: contacts.map((c) => ({
        id: c._id,
        prenom: c.prenom,
        nom: c.nom,
        societe: c.societe_id ? societeById.get(c.societe_id)?.nom ?? "" : "",
        civilite: c.civilite ?? "",
        intitule_poste: c.intitule_poste ?? "",
        niveau_decision: c.niveau_decision ?? "",
        email: c.email ?? "",
        telephones: c.telephones.join(", "),
        linkedin_url: c.linkedin_url ?? "",
        langue: c.langue ?? "",
        anniversaire: c.anniversaire ?? "",
        tags: tagLabels(c.tags),
        notes: c.notes_md ?? "",
        updated_at: c.updated_at,
      })),
      deals: deals.map((d) => ({
        id: d._id,
        titre: d.titre,
        societe: societeById.get(d.societe_id)?.nom ?? "",
        contacts: d.contacts_ids
          .map((id) => {
            const c = contactById.get(id);
            return c ? `${c.prenom} ${c.nom}` : "";
          })
          .filter(Boolean)
          .join(", "),
        montant: d.montant,
        devise: d.devise,
        probabilite: d.probabilite,
        stage: d.stage,
        date_closing_prevue: d.date_closing_prevue ?? "",
        owner_id: d.owner_id,
        tags: tagLabels(d.tags),
        notes: d.notes_md ?? "",
        updated_at: d.updated_at,
      })),
      contrats: contrats.map((c) => ({
        id: c._id,
        societe: societeById.get(c.societe_id)?.nom ?? "",
        deal: dealById.get(c.deal_id)?.titre ?? "",
        date_signature: c.date_signature,
        date_debut: c.date_debut,
        date_fin: c.date_fin ?? "",
        montant_total: c.montant_total,
        devise: c.devise,
        frequence_facturation: c.frequence_facturation,
        tva: c.tva ?? "",
        statut: c.statut,
        updated_at: c.updated_at,
      })),
      reunions: reunions.map((r) => ({
        id: r._id,
        rattachement_type: r.attached_to.kind,
        rattachement_id: r.attached_to.id,
        date: r.date,
        duree_minutes: r.duree_minutes,
        lieu_ou_url: r.lieu_ou_url ?? "",
        participants: r.participants_ids
          .map((id) => {
            const c = contactById.get(id);
            return c ? `${c.prenom} ${c.nom}` : "";
          })
          .filter(Boolean)
          .join(", "),
        compte_rendu: r.compte_rendu_md ?? "",
        next_steps: r.next_steps.map((s) => s.description).join(" | "),
        updated_at: r.updated_at,
      })),
    };
  },
});

