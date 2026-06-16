"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
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
import type { EditorState } from "lexical";

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

class ErrorBoundary extends Component<
  { children: ReactElement; onError: (e: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { this.props.onError(e); }
  render() { return this.state.hasError ? null : this.props.children; }
}

export function MarkdownEditor({
  onChange,
  placeholder,
  initialValue,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
}) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "MarkdownEditor",
        editable: true,
        nodes: [ListNode, ListItemNode],
        onError: console.error,
        theme: {},
        editorState: initialValue
          ? () => $convertFromMarkdownString(initialValue, MD_TRANSFORMERS)
          : undefined,
      }}
    >
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="markdown-viewer min-h-[4.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" />
          }
          placeholder={
            placeholder ? (
              <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
                {placeholder}
              </div>
            ) : null
          }
          ErrorBoundary={ErrorBoundary}
        />
      </div>
      <ListPlugin />
      <HistoryPlugin />
      <OnChangePlugin
        onChange={(state: EditorState) =>
          state.read(() => onChange($convertToMarkdownString(MD_TRANSFORMERS)))
        }
      />
    </LexicalComposer>
  );
}
