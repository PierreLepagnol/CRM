"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListNode, ListItemNode } from "@lexical/list";
import { HeadingNode } from "@lexical/rich-text";
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
  HEADING,
} from "@lexical/markdown";
import { Component, useCallback, useEffect, useState, type ReactElement } from "react";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import type { EditorState } from "lexical";
import { cn } from "@CRM-APP/ui/lib/utils";

const MD_TRANSFORMERS = [
  HEADING,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  UNORDERED_LIST,
  ORDERED_LIST,
];

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
        }
      });
    });
  }, [editor]);

  const formatHeading = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const element = selection.anchor.getNode().getTopLevelElementOrThrow();
      element.replace($createHeadingNode("h2"), true);
    });
  }, [editor]);

  return (
    <div className="flex gap-1 border-b border-input bg-muted/50 px-2 py-1">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"); }}
        className={cn("rounded px-2 py-0.5 text-sm font-bold hover:bg-accent", isBold && "bg-accent")}
      >
        B
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"); }}
        className={cn("rounded px-2 py-0.5 text-sm italic hover:bg-accent", isItalic && "bg-accent")}
      >
        I
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); formatHeading(); }}
        className="rounded px-2 py-0.5 text-sm font-bold hover:bg-accent"
      >
        H
      </button>
    </div>
  );
}

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
        nodes: [ListNode, ListItemNode, HeadingNode],
        onError: console.error,
        theme: {},
        editorState: initialValue
          ? () => $convertFromMarkdownString(initialValue, MD_TRANSFORMERS)
          : undefined,
      }}
    >
      <div className="rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="markdown-viewer min-h-[4.5rem] w-full bg-background px-3 py-2 text-sm focus-visible:outline-none" />
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
