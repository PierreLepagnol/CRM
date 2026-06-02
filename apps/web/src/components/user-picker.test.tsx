import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ResponsiblesMultiSelect, type AppUserOption } from "./user-picker";

const users: AppUserOption[] = [
  { user_id: "u1", name: "Alice Martin", email: "alice@example.fr" },
  { user_id: "u2", name: "Bob Durand", email: "bob@example.fr" },
];

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
