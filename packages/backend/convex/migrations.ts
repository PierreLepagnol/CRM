import { internalAction, internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { matchOwnerByName } from "./lib/accessLogic";

// Run once from the Convex dashboard to purge all credential (email/password)
// accounts and orphaned users that have no Microsoft SSO account.
export const cleanNonMicrosoftAuth = internalAction({
  args: {},
  handler: async (ctx) => {
    const { page: credentialAccounts } = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "account",
        where: [{ field: "providerId", value: "credential" }],
        paginationOpts: { numItems: 1000, cursor: null },
      },
    );

    let deletedAccounts = 0;
    let deletedUsers = 0;
    let deletedSessions = 0;

    for (const account of credentialAccounts) {
      const microsoftAccount = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "account",
          where: [
            { field: "userId", value: account.userId },
            { field: "providerId", value: "microsoft" },
          ],
        },
      );

      if (!microsoftAccount) {
        const { page: sessions } = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "session",
            where: [{ field: "userId", value: account.userId }],
            paginationOpts: { numItems: 1000, cursor: null },
          },
        );

        for (const session of sessions) {
          await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
            input: { model: "session", where: [{ field: "_id", value: session._id }] },
          });
          deletedSessions++;
        }

        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: { model: "user", where: [{ field: "_id", value: account.userId }] },
        });
        deletedUsers++;
      }

      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: { model: "account", where: [{ field: "_id", value: account._id }] },
      });
      deletedAccounts++;
    }

    console.log({ deletedAccounts, deletedUsers, deletedSessions });
    return { deletedAccounts, deletedUsers, deletedSessions };
  },
});

// One-shot migration: import dev data into this deployment.
// Run with: npx convex run --prod migrations:importDevData
export const importDevData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("contacts").first();
    if (existing) return { skipped: true, reason: "contacts table already has data" };

    const contacts = [
      {"_id":"j9714nhz4dxa1en0kvm8kfjs6d862a43","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"CEGEDIM","nom":"Lory","position":9,"prenom":"O","stage":"contacte","updated_at":1777881537385},
      {"_id":"j973fzqb6rejfnp05p62ykyaqd862zdw","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"Europ Assistance","next_relance_at":1777852800000,"nom":"Normand","position":8,"poste":"DSI","prenom":"Jean-Christophe","stage":"contacte","updated_at":1777879062133},
      {"_id":"j97egd080zk91mtefcht92d4dx860c7c","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"Renault Digital","next_relance_at":1778025600000,"nom":"Mom","position":7,"poste":"Dev chatper Formation","prenom":"Michel","stage":"contacte","updated_at":1777839694602},
      {"_id":"j971p313pasgn42tzbegxvkdzd85ttyx","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"Certigroup","next_relance_at":1778544000000,"nom":"Bienfait","position":6,"poste":"Président","prenom":"Didier","stage":"contacte","updated_at":1777839714421},
      {"_id":"j972c8fk2wmxez2whxf4eg8v1x85tn82","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"Système U","next_relance_at":1779235200000,"nom":"Piton","position":1,"poste":"Directeur transfo IT","prenom":"Thomas","stage":"rdv","updated_at":1777881384914},
      {"_id":"j972yv8kqcqz9jkqjwpf7sjhc585vach","contact_sciam":"Maurin","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","entreprise":"Matmut","next_relance_at":1777939200000,"nom":"Munsch","position":5,"prenom":"Cédric","stage":"contacte","updated_at":1777839029598},
      {"_id":"j97a8r5nh07a1jm5mmmk5s0qxn85vct0","contact_sciam":"Bruno","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","entreprise":"Credit Logement","nom":"Queinnec","notes_md":"Rencontré au stand SCIAM, intéressé par Architecture, Devops, Cloud Souverain","position":4,"poste":"Tech Lead","prenom":"Julien","stage":"contacte","updated_at":1777577885243},
      {"_id":"j97f5rbsef4q59n86ej545rrnd85vp5x","contact_sciam":"Bruno","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","entreprise":"BNP CIB","nom":"Toukabri","notes_md":"Ex SFEIR --> fixe BNP","position":2,"poste":"Senior Dev","prenom":"Aroua","stage":"contacte","updated_at":1777577885243},
      {"_id":"j974dyt0gw53zzrfyrx9wrrpc585v57d","contact_sciam":"Bruno","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","entreprise":"Generali","nom":"Defraine","notes_md":"Rencontré au stand SCIAM, intéressé par nos offres IA?","position":0,"poste":"Architecte","prenom":"Cédric","stage":"contacte","updated_at":1777880596961},
      {"_id":"j97ek660ppspj55scr5t5dmtmx85txqw","contact_sciam":"Maurin","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","entreprise":"La Poste","nom":"Nadjar","notes_md":"Rencontré au stand SCIAM, intéressé par nos offres Java","position":0,"poste":"CTO","prenom":"Yann","stage":"nouveau","updated_at":1777559400989},
      {"_id":"j973nx10xe6x5zmxp4zbn7jn5985v1mv","contact_sciam":"Bruno","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","entreprise":"Generali","next_relance_at":1777939200000,"nom":"Belamri","notes_md":"Rencontré au stand SCIAM, intéressé par nos expertises Java, IA for Dev, Containerisastion","position":0,"poste":"Resp dept IL","prenom":"Karima","stage":"rdv","updated_at":1777881384914},
      {"_id":"j975vcd3vjr98xgkbnw70hxc9d85rtat","contact_sciam":"Pierre Lepagnol","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","email":"yves_lestang@smabtp.fr","entreprise":"SMABTP","next_relance_at":1777939200000,"nom":"Lestang","position":3,"poste":"Assureur/Dev","prenom":"Yves","stage":"contacte","updated_at":1777577885243},
    ] as const;

    const interactions = [
      {"contact_id":"j973nx10xe6x5zmxp4zbn7jn5985v1mv","created_by":"k1718qdye85hz7kttgw8fgvtes85vf3p","date_at":1777939200000,"resume":"Brief sur besoins","type":"rdv"},
      {"contact_id":"j973fzqb6rejfnp05p62ykyaqd862zdw","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1777852800000,"resume":"Relance programmée pour le 04/05/2026","type":"relance"},
      {"contact_id":"j973nx10xe6x5zmxp4zbn7jn5985v1mv","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1777939200000,"resume":"Relance programmée pour le 05/05/2026","type":"relance"},
      {"contact_id":"j971p313pasgn42tzbegxvkdzd85ttyx","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1778544000000,"resume":"Relance programmée pour le 12/05/2026","type":"relance"},
      {"contact_id":"j97egd080zk91mtefcht92d4dx860c7c","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1778025600000,"resume":"Relance programmée pour le 06/05/2026","type":"relance"},
      {"contact_id":"j972yv8kqcqz9jkqjwpf7sjhc585vach","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1777939200000,"resume":"Relance programmée pour le 05/05/2026","type":"relance"},
      {"contact_id":"j972c8fk2wmxez2whxf4eg8v1x85tn82","created_by":"k17fbwa04m8xpwjvfc8ncx3g5h85v2b2","date_at":1779235200000,"resume":"Relance programmée pour le 20/05/2026","type":"relance"},
      {"contact_id":"j97f5rbsef4q59n86ej545rrnd85vp5x","created_by":"k170f6k6919kzphcrrd531vv9585vxkc","date_at":1777593600000,"resume":"Relance programmée pour le 01/05/2026","type":"relance"},
      {"contact_id":"j973nx10xe6x5zmxp4zbn7jn5985v1mv","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j974dyt0gw53zzrfyrx9wrrpc585v57d","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance LK","type":"relance"},
      {"contact_id":"j97f5rbsef4q59n86ej545rrnd85vp5x","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance LK","type":"relance"},
      {"contact_id":"j97a8r5nh07a1jm5mmmk5s0qxn85vct0","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance LK","type":"relance"},
      {"contact_id":"j97a8r5nh07a1jm5mmmk5s0qxn85vct0","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j974dyt0gw53zzrfyrx9wrrpc585v57d","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j97ek660ppspj55scr5t5dmtmx85txqw","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j97f5rbsef4q59n86ej545rrnd85vp5x","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j973nx10xe6x5zmxp4zbn7jn5985v1mv","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777334400000,"resume":"Relance programmée pour le 28/04/2026","type":"relance"},
      {"contact_id":"j975vcd3vjr98xgkbnw70hxc9d85rtat","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777939200000,"resume":"Relance programmée pour le 05/05/2026","type":"relance"},
      {"contact_id":"j975vcd3vjr98xgkbnw70hxc9d85rtat","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1777939200000,"resume":"Relance programmée pour le 05/05/2026","type":"relance"},
      {"contact_id":"j975vcd3vjr98xgkbnw70hxc9d85rtat","created_by":"k170ckfjp96kvaw5yvze7wagn185r0vt","date_at":1778716800000,"resume":"Relance programmée pour le 14/05/2026","type":"relance"},
    ] as const;

    const idMap: Record<string, Id<"contacts">> = {};
    for (const { _id: oldId, ...data } of contacts) {
      const newId = await ctx.db.insert("contacts", data as any);
      idMap[oldId] = newId;
    }

    let importedInteractions = 0;
    for (const { contact_id: oldContactId, ...data } of interactions) {
      const newContactId = idMap[oldContactId];
      if (!newContactId) continue;
      await ctx.db.insert("interactions", { ...data, contact_id: newContactId } as any);
      importedInteractions++;
    }

    return { contacts: Object.keys(idMap).length, interactions: importedInteractions };
  },
});

// One-shot backfill: map legacy free-text contact_sciam to owner_id by matching
// the SSO display name in app_users. Run once after deploy:
//   npx convex run migrations:backfillContactOwners
// Contacts without a single confident name match are left untouched.
export const backfillContactOwners = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = (await ctx.db.query("app_users").collect()).map((u) => ({
      user_id: u.user_id,
      name: u.name,
    }));

    const contacts = await ctx.db.query("contacts").collect();
    let matched = 0;
    let skipped = 0;

    for (const c of contacts) {
      if (c.deleted_at !== undefined || c.owner_id) continue;
      const ownerId = matchOwnerByName(c.contact_sciam, users);
      if (ownerId) {
        await ctx.db.patch(c._id, { owner_id: ownerId, updated_at: Date.now() });
        matched++;
      } else if (c.contact_sciam) {
        skipped++;
      }
    }

    return { matched, skipped };
  },
});
