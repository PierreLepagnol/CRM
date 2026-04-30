import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";

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
