import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "./markdown-viewer";

describe("MarkdownViewer", () => {
  it("renders bold text", () => {
    render(<MarkdownViewer content="**bold**" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("renders italic text", () => {
    render(<MarkdownViewer content="*italic*" />);
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("renders unordered list", () => {
    render(<MarkdownViewer content={"- apple\n- banana"} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
