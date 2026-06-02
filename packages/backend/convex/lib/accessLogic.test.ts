import { describe, expect, it } from "vitest";

import {
  allowedPagesFromRows,
  applyPageDelta,
  assertRoleChangeAllowed,
  canAccessPage,
  canReadContacts,
  canWriteContacts,
  matchOwnerByName,
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
});
