import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EntrepriseCombobox, type EntrepriseValue } from "./entreprise-combobox";

// Convex hooks mockés : on pilote les suggestions et on observe la création.
const mockUseQuery = vi.fn();
const mockCreate = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockCreate,
}));

function Harness({ initial = { nom: "" } as EntrepriseValue }) {
  // Composant contrôlé : reflète les onChange comme le vrai parent.
  const [value, setValue] = useState<EntrepriseValue>(initial);
  return <EntrepriseCombobox value={value} onChange={setValue} />;
}

describe("EntrepriseCombobox", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockCreate.mockReset();
  });

  it("propose les suggestions et en sélectionne une (fixe l'id)", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue([{ _id: "e1", nom: "Crédit Agricole CIB" }]);
    render(<Harness />);

    await user.type(screen.getByRole("combobox"), "Crédit");
    const option = await screen.findByRole("option", { name: /Crédit Agricole CIB/ });
    await user.click(option);

    // Après sélection, le badge « rattaché » confirme que value.id est fixé.
    expect(screen.getByText(/Rattaché à une entreprise existante/)).toBeInTheDocument();
  });

  it("propose « Créer » quand aucune correspondance exacte, puis crée", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue([]); // aucune suggestion
    mockCreate.mockResolvedValue("new-id");
    render(<Harness />);

    await user.type(screen.getByRole("combobox"), "Nouvelle Boîte");
    await user.click(await screen.findByRole("button", { name: /Créer/ }));

    expect(mockCreate).toHaveBeenCalledWith({ nom: "Nouvelle Boîte" });
    expect(await screen.findByText(/Rattaché à une entreprise existante/)).toBeInTheDocument();
  });

  it("n'affiche PAS « Créer » quand une correspondance exacte existe", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue([{ _id: "e1", nom: "ACME" }]);
    render(<Harness />);

    await user.type(screen.getByRole("combobox"), "acme");
    // La suggestion exacte s'affiche…
    expect(await screen.findByRole("option", { name: /ACME/ })).toBeInTheDocument();
    // …mais pas d'option de création (doublon évité, cf. ADR 0001).
    expect(screen.queryByRole("button", { name: /Créer/ })).not.toBeInTheDocument();
  });
});
