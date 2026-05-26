"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import CodeBlock from "@tiptap/extension-code-block";
import {
  ResizableImage,
  VideoEmbed,
  youtubeEmbedUrl,
} from "@/lib/editorial-editor/extensions";

export type NewsroomTipTapEditorProps = {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  markdownMode: boolean;
  markdown: string;
  onMarkdownChange: (md: string) => void;
  editable?: boolean;
};

async function uploadImageFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function NewsroomTipTapEditor({
  initialHtml,
  onHtmlChange,
  markdownMode,
  markdown,
  onMarkdownChange,
  editable = true,
}: NewsroomTipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlock.configure({ HTMLAttributes: { class: "jd-code-block" } }),
      Underline,
      ResizableImage,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Tell the story — blocks, quotes, media…",
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      VideoEmbed,
    ],
    content: initialHtml || "<p></p>",
    editable: editable && !markdownMode,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onHtmlChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "jd-editor-prose",
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        void uploadImageFile(file).then((src) => {
          if (src) {
            const { schema } = view.state;
            const node = schema.nodes.image?.create({ src, width: "100%" });
            if (node) {
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })?.pos;
              if (pos != null) {
                view.dispatch(view.state.tr.insert(pos, node));
              }
            }
          }
        });
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable && !markdownMode);
  }, [editor, editable, markdownMode]);

  const insertImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void uploadImageFile(file).then((src) => {
        if (src) editor?.chain().focus().setImage({ src, width: "100%" }).run();
      });
    };
    input.click();
  }, [editor]);

  const setImageWidth = useCallback(
    (width: string) => {
      if (!editor?.isActive("image")) return;
      editor.chain().focus().updateAttributes("image", { width }).run();
    },
    [editor]
  );

  if (!editor) return <div className="jd-editor-skeleton" />;

  return (
    <div className="jd-editor-surface">
      {!markdownMode ? (
        <div className="jd-editor-toolbar" role="toolbar">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "is-on" : ""}>B</button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "is-on" : ""}>I</button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? "is-on" : ""}>U</button>
          <span className="jd-editor-toolbar__sep" />
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "is-on" : ""}>H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? "is-on" : ""}>H3</button>
          <span className="jd-editor-toolbar__sep" />
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
          <button
            type="button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBlockquote()
                .updateAttributes("blockquote", { class: "jd-pull-quote" })
                .run()
            }
          >
            Pull quote
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code</button>
          <span className="jd-editor-toolbar__sep" />
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</button>
          <button type="button" onClick={insertImage}>Image</button>
          <select
            className="jd-editor-toolbar__select"
            aria-label="Image width"
            onChange={(e) => setImageWidth(e.target.value)}
            defaultValue="100%"
          >
            <option value="100%">Full</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
            <option value="33%">33%</option>
          </select>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt("YouTube or video embed URL");
              if (!url) return;
              const embed = youtubeEmbedUrl(url) ?? url;
              editor.chain().focus().setVideoEmbed(embed).run();
            }}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt("Link URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
          >
            Link
          </button>
        </div>
      ) : null}

      {markdownMode ? (
        <textarea
          className="jd-editor-markdown"
          value={markdown}
          onChange={(e) => onMarkdownChange(e.target.value)}
          spellCheck
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
