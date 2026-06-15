import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "./markdown-editor";

describe("MarkdownEditor", () => {
  it("shows placeholder text", () => {
    render(<MarkdownEditor onChange={vi.fn()} placeholder="Résumé de l'échange…" />);
    expect(screen.getByText("Résumé de l'échange…")).toBeInTheDocument();
  });

  it("is editable", () => {
    render(<MarkdownEditor onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("contenteditable", "true");
  });
});
