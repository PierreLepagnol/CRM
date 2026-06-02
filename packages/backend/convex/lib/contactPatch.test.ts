import { describe, expect, it } from "vitest";

import { toClearableDbPatch } from "./contactPatch";

describe("toClearableDbPatch", () => {
  it("converts a null clearable field into an explicit field-delete (undefined)", () => {
    const result = toClearableDbPatch({ owner_id: null });
    expect("owner_id" in result).toBe(true);
    expect(result.owner_id).toBeUndefined();
  });

  it("keeps a real value untouched", () => {
    expect(toClearableDbPatch({ owner_id: "u1" })).toEqual({ owner_id: "u1" });
  });

  it("does not introduce a clearable key that was not provided", () => {
    const result = toClearableDbPatch({ prenom: "Ada" });
    expect("owner_id" in result).toBe(false);
    expect("next_relance_at" in result).toBe(false);
  });

  it("also clears next_relance_at via null (existing behavior, unified)", () => {
    const result = toClearableDbPatch({ next_relance_at: null });
    expect("next_relance_at" in result).toBe(true);
    expect(result.next_relance_at).toBeUndefined();
  });
});
