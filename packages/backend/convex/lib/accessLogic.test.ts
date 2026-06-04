import { describe, expect, it } from "vitest";

import {
  allowedPagesFromRows,
  applyPageDelta,
  assertRoleChangeAllowed,
  canAccessPage,
  canReadContacts,
  canWriteContacts,
  matchOwnerByName,
  mergeAuthUsersWithRoles,
  pickBackfillOwner,
  resolveRole,
  sanitizeRolePages,
} from "./accessLogic";

describe("resolveRole", () => {
  it("falls back to the least-privileged role when the user has no role", () => {
    // An authenticated user whose app_users row hasn't been provisioned yet
    // must NOT be treated as a writable role; default to 'lecteur'.
    expect(resolveRole(undefined)).toBe("lecteur");
  });

  it("keeps an explicit role", () => {
    expect(resolveRole("admin")).toBe("admin");
    expect(resolveRole("commercial")).toBe("commercial");
  });
});

describe("allowedPagesFromRows", () => {
  it("uses the stored permission row when present", () => {
    const rows = [{ role: "commercial" as const, pages: ["pipeline" as const] }];
    expect(allowedPagesFromRows("commercial", rows)).toEqual(["pipeline"]);
  });

  it("falls back to the default pages when no row exists for the role", () => {
    expect(allowedPagesFromRows("commercial", [])).toEqual([
      "pipeline",
      "contacts",
      "entreprises",
    ]);
  });
});

describe("canAccessPage", () => {
  it("denies a page not in the role's allowed set", () => {
    // commercial default = pipeline + contacts, so projets is denied.
    expect(canAccessPage("commercial", "projets", [])).toBe(false);
  });

  it("allows a page in the role's allowed set", () => {
    expect(canAccessPage("commercial", "contacts", [])).toBe(true);
  });
});

describe("contacts access", () => {
  it("lets a pipeline-only role (lecteur) READ contacts but not WRITE them", () => {
    // lecteur default = ['pipeline']: the pipeline view needs to read contacts,
    // but lecteur must stay read-only.
    expect(canReadContacts("lecteur", [])).toBe(true);
    expect(canWriteContacts("lecteur", [])).toBe(false);
  });

  it("lets a contacts role read and write", () => {
    expect(canReadContacts("commercial", [])).toBe(true);
    expect(canWriteContacts("commercial", [])).toBe(true);
  });

  it("denies read to a role with neither pipeline nor contacts", () => {
    const rows = [{ role: "lecteur" as const, pages: ["projets" as const] }];
    expect(canReadContacts("lecteur", rows)).toBe(false);
    expect(canWriteContacts("lecteur", rows)).toBe(false);
  });
});

describe("assertRoleChangeAllowed", () => {
  it("rejects demoting the last remaining admin", () => {
    expect(() =>
      assertRoleChangeAllowed({
        currentRole: "admin",
        newRole: "lecteur",
        adminCount: 1,
      }),
    ).toThrow();
  });

  it("allows demoting an admin when another admin remains", () => {
    expect(() =>
      assertRoleChangeAllowed({
        currentRole: "admin",
        newRole: "lecteur",
        adminCount: 2,
      }),
    ).not.toThrow();
  });

  it("allows changing a non-admin and promoting to admin", () => {
    expect(() =>
      assertRoleChangeAllowed({
        currentRole: "commercial",
        newRole: "lecteur",
        adminCount: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertRoleChangeAllowed({
        currentRole: "lecteur",
        newRole: "admin",
        adminCount: 1,
      }),
    ).not.toThrow();
  });

  it("is a no-op when the role is unchanged (admin stays admin)", () => {
    expect(() =>
      assertRoleChangeAllowed({
        currentRole: "admin",
        newRole: "admin",
        adminCount: 1,
      }),
    ).not.toThrow();
  });
});

describe("applyPageDelta", () => {
  it("adds a page that was absent", () => {
    expect(applyPageDelta(["pipeline"], "contacts", true)).toEqual([
      "pipeline",
      "contacts",
    ]);
  });

  it("removes a page that was present", () => {
    expect(applyPageDelta(["pipeline", "contacts"], "contacts", false)).toEqual([
      "pipeline",
    ]);
  });

  it("never duplicates when adding an already-present page", () => {
    expect(applyPageDelta(["pipeline"], "pipeline", true)).toEqual(["pipeline"]);
  });

  it("is a no-op when removing an absent page", () => {
    expect(applyPageDelta(["pipeline"], "projets", false)).toEqual(["pipeline"]);
  });
});

describe("sanitizeRolePages", () => {
  it("forces the admin role to always retain the admin page", () => {
    expect(sanitizeRolePages("admin", ["pipeline"])).toContain("admin");
  });

  it("leaves non-admin roles untouched", () => {
    expect(sanitizeRolePages("commercial", ["pipeline"])).toEqual(["pipeline"]);
  });
});

describe("matchOwnerByName", () => {
  const users = [
    { user_id: "u1", name: "Bruno Martin" },
    { user_id: "u2", name: "Sophie Durand" },
  ];

  it("matches case-insensitively and trims whitespace", () => {
    expect(matchOwnerByName("  bruno martin ", users)).toBe("u1");
  });

  it("returns undefined when no name matches", () => {
    expect(matchOwnerByName("Inconnu", users)).toBeUndefined();
  });

  it("returns undefined for empty/missing input", () => {
    expect(matchOwnerByName(undefined, users)).toBeUndefined();
    expect(matchOwnerByName("   ", users)).toBeUndefined();
  });

  it("refuses to guess when the name is ambiguous", () => {
    const dupes = [
      { user_id: "a", name: "Jean" },
      { user_id: "b", name: "Jean" },
    ];
    expect(matchOwnerByName("Jean", dupes)).toBeUndefined();
  });

  it("matches accent-insensitively", () => {
    const accented = [{ user_id: "u3", name: "Cédric Munsch" }];
    expect(matchOwnerByName("cedric munsch", accented)).toBe("u3");
  });

  it("matches a single first name against a full SSO name (legacy contact_sciam)", () => {
    // contact_sciam holds "Maurin", app_users holds the full display name.
    const full = [
      { user_id: "u1", name: "Maurin Voldoire" },
      { user_id: "u2", name: "Sophie Durand" },
    ];
    expect(matchOwnerByName("Maurin", full)).toBe("u1");
  });

  it("still refuses a first name shared by two users", () => {
    const full = [
      { user_id: "u1", name: "Maurin Voldoire" },
      { user_id: "u2", name: "Maurin Petit" },
    ];
    expect(matchOwnerByName("Maurin", full)).toBeUndefined();
  });

  it("falls back to a prefix match when no exact/token match exists", () => {
    const full = [
      { user_id: "u1", name: "Pierre Lepagnol" },
      { user_id: "u2", name: "Sophie Durand" },
    ];
    expect(matchOwnerByName("Pier", full)).toBe("u1");
  });

  it("ignores too-short prefixes to avoid over-matching", () => {
    const full = [
      { user_id: "u1", name: "Bruno Martin" },
      { user_id: "u2", name: "Bernard Petit" },
    ];
    // "B" (< 3 chars) must not match anyone.
    expect(matchOwnerByName("B", full)).toBeUndefined();
  });
});

describe("pickBackfillOwner", () => {
  const users = [
    { user_id: "u1", name: "Maurin Voldoire" },
    { user_id: "u2", name: "Sophie Durand" },
  ];

  it("prefers the user matched by the legacy contact_sciam name", () => {
    expect(
      pickBackfillOwner({
        contactSciam: "Maurin",
        users,
        defaultUserId: "default",
      }),
    ).toBe("u1");
  });

  it("falls back to the default user when the name matches nobody", () => {
    expect(
      pickBackfillOwner({
        contactSciam: "Inconnu Total",
        users,
        defaultUserId: "default",
      }),
    ).toBe("default");
  });

  it("falls back to the default user when there is no legacy name at all", () => {
    expect(
      pickBackfillOwner({ contactSciam: undefined, users, defaultUserId: "default" }),
    ).toBe("default");
  });
});

describe("mergeAuthUsersWithRoles", () => {
  const authUsers = [
    { _id: "u1", name: "Alice", email: "alice@x.fr", image: "a.png" },
    { _id: "u2", name: "Bob", email: "bob@x.fr" },
  ];
  const appUsers = [
    { user_id: "u1", role: "admin" as const, name: "Alice", email: "alice@x.fr" },
  ];

  it("lists every logged-in user, with their role from app_users", () => {
    const merged = mergeAuthUsersWithRoles(authUsers, appUsers);
    expect(merged.map((m) => m.user_id).sort()).toEqual(["u1", "u2"]);
    expect(merged.find((m) => m.user_id === "u1")?.role).toBe("admin");
  });

  it("defaults a not-yet-provisioned user to 'lecteur'", () => {
    const merged = mergeAuthUsersWithRoles(authUsers, appUsers);
    const bob = merged.find((m) => m.user_id === "u2");
    expect(bob?.role).toBe("lecteur");
    expect(bob?.provisioned).toBe(false);
  });

  it("marks provisioned users", () => {
    const merged = mergeAuthUsersWithRoles(authUsers, appUsers);
    expect(merged.find((m) => m.user_id === "u1")?.provisioned).toBe(true);
  });

  it("falls back to the auth name/email when no app_users row exists", () => {
    const merged = mergeAuthUsersWithRoles(
      [{ _id: "u3", email: "carol@x.fr" }],
      [],
    );
    expect(merged[0].name).toBe("carol@x.fr");
    expect(merged[0].email).toBe("carol@x.fr");
  });
});
