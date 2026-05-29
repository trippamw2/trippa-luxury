"use client";

import { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Link, Image, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Toolbar Button ──────────────────────────────────── */
function ToolBtn({
  onClick, active, children, label,
}: {
  onClick: () => void; active?: boolean; children: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-gold/20 text-soft-black"
          : "text-earth hover:bg-sand-light hover:text-soft-black",
      )}
    >
      {children}
    </button>
  );
}

/* ─── Divider ─────────────────────────────────────────── */
function Sep() {
  return <div className="w-px h-5 bg-sand-light mx-1" />;
}

/* ─── Props ───────────────────────────────────────────── */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minH?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/* ─── Editor ──────────────────────────────────────────── */
export function RichTextEditor({
  value, onChange, placeholder = "Start writing...", minH = "240px",
  label, error, disabled,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none px-4 py-3 min-h-[80px] focus:outline-none",
          "text-soft-black",
          "[&_.ProseMirror-placeholder]:text-earth/50 [&_.ProseMirror-placeholder]:text-sm",
        ),
      },
    },
  });

  /* Expose imperative setContent for external updates */
  const prevValue = useRef(value);
  if (value !== prevValue.current && editor && editor.getHTML() !== value) {
    prevValue.current = value;
    editor.commands.setContent(value || "");
  }

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL", "https://");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  const id = `rte-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-earth uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div
        id={id}
        className={cn(
          "border bg-white transition-colors overflow-hidden",
          "focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgba(194,164,109,0.1)]",
          error ? "border-red-300" : "border-sand-light",
        )}
        style={{ minHeight: minH }}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-sand-light bg-warm-white/50">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading">
            <Heading2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Subheading">
            <Heading1 className="w-4 h-4" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list">
            <List className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Ordered list">
            <ListOrdered className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote">
            <Quote className="w-4 h-4" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={setLink} active={editor.isActive("link")} label="Link">
            <Link className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={addImage} label="Image">
            <Image className="w-4 h-4" />
          </ToolBtn>
          <div className="flex-1" />
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo">
            <Undo className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo">
            <Redo className="w-4 h-4" />
          </ToolBtn>
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
