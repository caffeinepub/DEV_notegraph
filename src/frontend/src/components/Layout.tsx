import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { Moon, PanelLeft, PanelRight, Sun } from "lucide-react";
import type { ReactNode } from "react";

interface LayoutProps {
  sidebar?: ReactNode;
  editor?: ReactNode;
  rightPanel?: ReactNode;
}

export function Layout({ sidebar, editor, rightPanel }: LayoutProps) {
  const {
    toggleTheme,
    theme,
    toggleSidebar,
    toggleRightPanel,
    isSidebarOpen,
    isRightPanelOpen,
  } = useStore();

  return (
    <TooltipProvider delayDuration={600}>
      <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header
          data-ocid="header"
          className="h-11 flex items-center justify-between px-4 bg-background border-b border-border flex-shrink-0 z-10"
        >
          {/* Left: sidebar toggle + app name */}
          <div className="flex items-center gap-3 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-fast rounded"
                  onClick={toggleSidebar}
                  data-ocid="toggle-sidebar"
                  aria-label="Toggle sidebar"
                >
                  <PanelLeft className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Toggle sidebar
              </TooltipContent>
            </Tooltip>

            <span className="font-display font-semibold text-sm tracking-[-0.01em] text-foreground select-none">
              NoteGraph
            </span>
          </div>

          {/* Right: right panel toggle + theme toggle */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-fast rounded"
                  onClick={toggleTheme}
                  data-ocid="toggle-theme"
                  aria-label={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                >
                  {theme === "dark" ? (
                    <Sun className="size-3.5" />
                  ) : (
                    <Moon className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-fast rounded"
                  onClick={toggleRightPanel}
                  data-ocid="toggle-right-panel"
                  aria-label="Toggle right panel"
                >
                  <PanelRight className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Toggle info panel
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── Body: three-column grid ──────────────────────────── */}
        <div
          className={cn(
            "flex-1 min-h-0 grid transition-smooth",
            isSidebarOpen && isRightPanelOpen && "kb-layout-full",
            isSidebarOpen && !isRightPanelOpen && "kb-layout-no-right",
            !isSidebarOpen && isRightPanelOpen && "kb-layout-no-left",
            !isSidebarOpen && !isRightPanelOpen && "kb-layout-editor-only",
          )}
          style={{ gridTemplateRows: "1fr" }}
        >
          {/* Sidebar */}
          {isSidebarOpen && (
            <aside
              data-ocid="sidebar"
              className="min-h-0 overflow-hidden border-r border-border bg-sidebar flex flex-col"
            >
              {sidebar ?? <SidebarPlaceholder />}
            </aside>
          )}

          {/* Main editor */}
          <main
            data-ocid="editor-area"
            className="min-h-0 overflow-hidden bg-background flex flex-col"
          >
            {editor ?? <EditorPlaceholder />}
          </main>

          {/* Right panel */}
          {isRightPanelOpen && (
            <aside
              data-ocid="right-panel"
              className="min-h-0 overflow-hidden border-l border-border bg-sidebar flex flex-col"
            >
              {rightPanel ?? <RightPanelPlaceholder />}
            </aside>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="h-8 flex items-center justify-center px-4 border-t border-border flex-shrink-0 bg-background">
          <p className="text-[11px] text-muted-foreground/60 font-body tracking-[-0.01em]">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-fast underline-offset-2 hover:underline"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
}

// ── Placeholders ──────────────────────────────────────────────────────────────

function SidebarPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  );
}

function EditorPlaceholder() {
  return (
    <div
      data-ocid="empty-state"
      className="flex flex-col items-center justify-center h-full gap-4 p-12 text-center"
    >
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-foreground tracking-[-0.02em] leading-snug">
          Your knowledge base
        </h2>
        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed font-body">
          Select a note from the sidebar or press{" "}
          <kbd className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
            ⌘N
          </kbd>{" "}
          to create your first note.
        </p>
      </div>
    </div>
  );
}

function RightPanelPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  );
}

// ── Layout grid CSS ────────────────────────────────────────────────────────────
export const LAYOUT_STYLES = `
  .kb-layout-full          { grid-template-columns: 248px 1fr 264px; }
  .kb-layout-no-right      { grid-template-columns: 248px 1fr; }
  .kb-layout-no-left       { grid-template-columns: 1fr 264px; }
  .kb-layout-editor-only   { grid-template-columns: 1fr; }

  @media (max-width: 1024px) {
    .kb-layout-full        { grid-template-columns: 220px 1fr 240px; }
  }

  @media (max-width: 768px) {
    .kb-layout-full,
    .kb-layout-no-right,
    .kb-layout-no-left,
    .kb-layout-editor-only { grid-template-columns: 1fr; }
  }
`;
