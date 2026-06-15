"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  UNORDERED_LIST,
  ORDERED_LIST,
} from "@lexical/markdown";
import { Component, type ReactElement } from "react";

class ErrorBoundary extends Component<
  { children: ReactElement; onError: (e: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { this.props.onError(e); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const MD_TRANSFORMERS = [
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  UNORDERED_LIST,
  ORDERED_LIST,
];

export function MarkdownViewer({ content }: { content: string }) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "MarkdownViewer",
        editable: false,
        nodes: [ListNode, ListItemNode],
        editorState: () => $convertFromMarkdownString(content, MD_TRANSFORMERS),
        onError: console.error,
        theme: {},
      }}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="markdown-viewer mt-0.5 text-sm outline-none" />
        }
        placeholder={null}
        ErrorBoundary={ErrorBoundary}
      />
      <ListPlugin />
    </LexicalComposer>
  );
}
