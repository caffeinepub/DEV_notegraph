import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  readOnly?: boolean;
}

export function TagEditor({
  tags,
  onChange,
  className = "",
  readOnly = false,
}: TagEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function handleBlur() {
    if (inputValue.trim()) {
      addTag(inputValue);
      setInputValue("");
    }
  }

  function handleContainerKeyDown(e: KeyboardEvent<HTMLFieldSetElement>) {
    if (e.key === "Enter" || e.key === " ") {
      inputRef.current?.focus();
    }
  }

  return (
    <fieldset
      className={`flex flex-wrap items-center gap-1 cursor-text border-0 p-0 m-0 min-w-0 ${className}`}
      onClick={() => !readOnly && inputRef.current?.focus()}
      onKeyDown={handleContainerKeyDown}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/80 text-muted-foreground text-[11px] font-body transition-fast hover:bg-muted"
          data-ocid="tag-chip"
        >
          <span>{tag}</span>
          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-muted-foreground/50 hover:text-foreground transition-fast rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="h-5 min-w-[70px] flex-1 border-0 bg-transparent px-0 py-0 text-[11px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30"
          data-ocid="tag-input"
          aria-label="Add tag"
        />
      )}
      {readOnly && tags.length === 0 && (
        <span className="text-[11px] text-muted-foreground/30 font-body">
          No tags
        </span>
      )}
    </fieldset>
  );
}
