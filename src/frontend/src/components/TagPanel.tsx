import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

export function TagPanel() {
  const { tags, activeTag, setActiveTag } = useStore();

  if (tags.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground/50 px-4 py-1.5 italic">
        No tags yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 px-3 py-1">
      {tags.map(({ tag, count }) => {
        const isActive = activeTag === tag;
        return (
          <button
            type="button"
            key={tag}
            onClick={() => setActiveTag(isActive ? null : tag)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
              "transition-fast cursor-pointer",
              isActive
                ? "bg-primary/12 text-primary"
                : "bg-muted/60 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
            data-ocid={`tag-pill-${tag}`}
            aria-pressed={isActive}
          >
            <span className="truncate max-w-[100px]">{tag}</span>
            <span
              className={cn(
                "tabular-nums font-mono text-[10px] leading-none",
                isActive ? "text-primary/70" : "text-muted-foreground/50",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
