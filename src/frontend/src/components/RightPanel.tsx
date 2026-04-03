import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/store/useStore";
import type { PanelView } from "@/types";
import { GitFork, Link2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { BacklinksPanel } from "./BacklinksPanel";
import { GraphView } from "./GraphView";

export function RightPanel() {
  const { isRightPanelOpen, toggleRightPanel } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Slide-in animation on open
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (isRightPanelOpen) {
      el.style.transform = "translateX(100%)";
      el.style.opacity = "0";
      void el.offsetHeight;
      el.style.transition =
        "transform 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease";
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
    }
  }, [isRightPanelOpen]);

  return (
    <div
      ref={panelRef}
      data-ocid="right-panel-inner"
      className="flex flex-col h-full w-full overflow-hidden"
    >
      <RightPanelContent onClose={toggleRightPanel} />
    </div>
  );
}

function RightPanelContent({ onClose: _onClose }: { onClose: () => void }) {
  const { activeNoteId } = useStore();

  const defaultTab: PanelView = activeNoteId ? "backlinks" : "graph";

  return (
    <Tabs
      defaultValue={defaultTab}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Tab header ─────────────────────────────────────────── */}
      <div className="flex items-center px-4 border-b border-border flex-shrink-0 h-11">
        <TabsList className="h-full bg-transparent gap-0 p-0 rounded-none">
          <TabsTrigger
            value="backlinks"
            data-ocid="tab-backlinks"
            className="h-full px-0 mr-5 text-[12px] rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground gap-1.5 font-medium shadow-none"
          >
            <Link2 className="size-3" />
            Backlinks
          </TabsTrigger>
          <TabsTrigger
            value="graph"
            data-ocid="tab-graph"
            className="h-full px-0 text-[12px] rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground gap-1.5 font-medium shadow-none"
          >
            <GitFork className="size-3" />
            Graph
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── Backlinks tab ─────────────────────────────────────── */}
      <TabsContent
        value="backlinks"
        data-ocid="backlinks-tab-content"
        className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
      >
        <BacklinksPanel />
      </TabsContent>

      {/* ── Graph tab ────────────────────────────────────────── */}
      <TabsContent
        value="graph"
        data-ocid="graph-tab-content"
        className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col"
      >
        <GraphView />
      </TabsContent>
    </Tabs>
  );
}
