import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  OwnerSelect,
  ResponsiblesMultiSelect,
  resolveOwnerLabel,
  type AppUserOption,
} from "./user-picker";

const users: AppUserOption[] = [
  { user_id: "u1", name: "Alice Martin", email: "alice@example.fr" },
  { user_id: "u2", name: "Bob Durand", email: "bob@example.fr" },
];

describe("resolveOwnerLabel", () => {
  it("renders the owner's name when the id matches a known user", () => {
    expect(resolveOwnerLabel("u1", users)).toBe("Alice Martin");
  });

  it("renders 'Aucun propriétaire' when no owner is set", () => {
    expect(resolveOwnerLabel(undefined, users)).toBe("Aucun propriétaire");
  });

  it("renders 'Utilisateur inconnu' for an id that matches no user (never the raw id)", () => {
    expect(resolveOwnerLabel("k17fbwa04m8xpwjvfc8ncx3g5h85v2b2", users)).toBe(
      "Utilisateur inconnu",
    );
  });
});

describe("OwnerSelect", () => {
  it("shows the owner's name in the closed trigger, never the raw id", () => {
    const rawId = "k17fbwa04m8xpwjvfc8ncx3g5h85v2b2";
    render(
      <OwnerSelect
        users={[{ user_id: rawId, name: "Alice Martin", email: "a@x.fr" }]}
        value={rawId}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.queryByText(rawId)).not.toBeInTheDocument();
  });
});

describe("ResponsiblesMultiSelect", () => {
  it("opens the responsables menu without crashing", async () => {
    const user = userEvent.setup();
    render(
      <ResponsiblesMultiSelect users={users} value={[]} onChange={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: /aucun responsable/i }));

    // The group label only renders inside a Menu.Group; without it Base UI
    // throws (#31) and the menu never mounts.
    expect(await screen.findByText("Responsables")).toBeInTheDocument();
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
  });
});
