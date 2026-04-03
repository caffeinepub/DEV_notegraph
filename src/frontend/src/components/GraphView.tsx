import { useStore } from "@/store/useStore";
import { Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeData {
  id: string;
  title: string;
  connections: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface EdgeData {
  from: string;
  to: string;
  isBacklink: boolean;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_BASE_R = 14;
const NODE_MAX_R = 26;
const REPULSION = 10000;
const ATTRACTION = 0.015;
const DAMPING = 0.82;
const MAX_FRAMES = 200;
const CENTER_GRAVITY = 0.03;

function nodeRadius(connections: number): number {
  return Math.min(NODE_BASE_R + connections * 2.5, NODE_MAX_R);
}

// ── Force simulation ──────────────────────────────────────────────────────────

function runSimulation(
  nodes: NodeData[],
  edges: EdgeData[],
  onTick: (nodes: NodeData[]) => void,
  onDone: () => void,
): () => void {
  let frame = 0;
  let rafId = 0;
  const ns = nodes.map((n) => ({ ...n }));

  const edgeMap = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!edgeMap.has(e.from)) edgeMap.set(e.from, new Set());
    if (!edgeMap.has(e.to)) edgeMap.set(e.to, new Set());
    edgeMap.get(e.from)!.add(e.to);
    edgeMap.get(e.to)!.add(e.from);
  }

  function tick() {
    if (frame >= MAX_FRAMES) {
      onTick(ns);
      onDone();
      return;
    }
    frame++;

    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[j].x - ns[i].x;
        const dy = ns[j].y - ns[i].y;
        const dist2 = dx * dx + dy * dy + 1;
        const force = REPULSION / dist2;
        const dist = Math.sqrt(dist2);
        ns[i].vx -= (force * dx) / dist;
        ns[i].vy -= (force * dy) / dist;
        ns[j].vx += (force * dx) / dist;
        ns[j].vy += (force * dy) / dist;
      }
    }

    for (const e of edges) {
      const a = ns.find((n) => n.id === e.from);
      const b = ns.find((n) => n.id === e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      a.vx += dx * ATTRACTION;
      a.vy += dy * ATTRACTION;
      b.vx -= dx * ATTRACTION;
      b.vy -= dy * ATTRACTION;
    }

    for (const n of ns) {
      n.vx -= n.x * CENTER_GRAVITY;
      n.vy -= n.y * CENTER_GRAVITY;
    }

    for (const n of ns) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }

    onTick(ns.map((n) => ({ ...n })));
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphView() {
  const { activeNoteId, notes, links, setActiveNoteId } = useStore();

  const [simNodes, setSimNodes] = useState<NodeData[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { graphNodes, graphEdges } = useMemo(() => {
    if (!activeNoteId) return { graphNodes: [], graphEdges: [] };

    const outbound = links.filter((l) => l.fromNoteId === activeNoteId);
    const inbound = links.filter((l) => l.toNoteId === activeNoteId);

    const connectedIds = new Set<string>([
      activeNoteId,
      ...outbound.map((l) => l.toNoteId),
      ...inbound.map((l) => l.fromNoteId),
    ]);

    const connCount = new Map<string, number>();
    for (const id of connectedIds) {
      const c = links.filter(
        (l) => l.fromNoteId === id || l.toNoteId === id,
      ).length;
      connCount.set(id, c);
    }

    const gNodes: NodeData[] = [];
    const angle = (2 * Math.PI) / Math.max(connectedIds.size - 1, 1);
    let i = 0;
    for (const id of connectedIds) {
      const note = notes.find((n) => n.id === id);
      if (!note) continue;
      const isCenter = id === activeNoteId;
      const r = isCenter ? 0 : 180;
      const theta = i * angle;
      gNodes.push({
        id,
        title: note.title,
        connections: connCount.get(id) ?? 0,
        x: isCenter ? 0 : Math.cos(theta) * r,
        y: isCenter ? 0 : Math.sin(theta) * r,
        vx: 0,
        vy: 0,
      });
      if (!isCenter) i++;
    }

    const gEdges: EdgeData[] = [
      ...outbound
        .filter((l) => connectedIds.has(l.toNoteId))
        .map((l) => ({
          from: l.fromNoteId,
          to: l.toNoteId,
          isBacklink: false,
        })),
      ...inbound
        .filter((l) => connectedIds.has(l.fromNoteId))
        .map((l) => ({ from: l.fromNoteId, to: l.toNoteId, isBacklink: true })),
    ];

    return { graphNodes: gNodes, graphEdges: gEdges };
  }, [activeNoteId, notes, links]);

  useEffect(() => {
    if (graphNodes.length === 0) {
      setSimNodes([]);
      return;
    }
    setSimRunning(true);
    setSimNodes(graphNodes);
    const cancel = runSimulation(
      graphNodes,
      graphEdges,
      (ns) => setSimNodes(ns),
      () => setSimRunning(false),
    );
    return cancel;
  }, [graphNodes, graphEdges]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if ((e.target as Element).closest("[data-node]")) return;
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      e.preventDefault();
    },
    [transform],
  );

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((t) => ({
      ...t,
      x: dragStart.current.tx + dx,
      y: dragStart.current.ty + dy,
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.min(Math.max(t.scale * delta, 0.3), 4),
    }));
  }, []);

  if (!activeNoteId || graphNodes.length === 0) {
    return (
      <div
        data-ocid="graph-empty-state"
        className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center"
      >
        <Share2 className="size-6 text-muted-foreground/25" />
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[160px]">
          {activeNoteId
            ? "No connections yet. Link notes using [[Note title]]."
            : "Select a note to see its graph."}
        </p>
      </div>
    );
  }

  const W = 400;
  const H = 400;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {simRunning && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] text-muted-foreground/50 bg-background/90 px-2 py-0.5 rounded border border-border">
            Simulating…
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-10 text-[10px] text-muted-foreground/30 select-none">
        Scroll to zoom · Drag to pan
      </div>

      <svg
        ref={svgRef}
        data-ocid="graph-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        aria-label="Knowledge graph"
        role="img"
      >
        <defs>
          <marker
            id="arrow-out"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" className="fill-primary/40" />
          </marker>
          <marker
            id="arrow-in"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" className="fill-muted-foreground/30" />
          </marker>
        </defs>

        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Edges */}
          {graphEdges.map((edge) => {
            const from = simNodes.find((n) => n.id === edge.from);
            const to = simNodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;

            const fr = nodeRadius(from.connections);
            const tr = nodeRadius(to.connections);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const x1 = from.x + (dx / dist) * fr;
            const y1 = from.y + (dy / dist) * fr;
            const x2 = to.x - (dx / dist) * (tr + 6);
            const y2 = to.y - (dy / dist) * (tr + 6);

            return (
              <line
                key={`e-${edge.from}-${edge.to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={1}
                strokeDasharray={edge.isBacklink ? "3 3" : undefined}
                markerEnd={
                  edge.isBacklink ? "url(#arrow-in)" : "url(#arrow-out)"
                }
                className={
                  edge.isBacklink
                    ? "stroke-muted-foreground/25"
                    : "stroke-primary/35"
                }
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            const r = nodeRadius(node.connections);
            const isActive = node.id === activeNoteId;
            const labelMaxChars = Math.max(6, Math.floor(r / 4));
            const label =
              node.title.length > labelMaxChars
                ? `${node.title.slice(0, labelMaxChars)}…`
                : node.title;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                data-node="true"
                onClick={() => setActiveNoteId(node.id)}
                className="cursor-pointer"
                tabIndex={0}
                aria-label={`Open note: ${node.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveNoteId(node.id);
                  }
                }}
              >
                <circle
                  r={r}
                  className={
                    isActive
                      ? "fill-primary/20 stroke-primary/60"
                      : "fill-card stroke-border hover:fill-muted hover:stroke-muted-foreground/40 transition-all"
                  }
                  strokeWidth={isActive ? 1.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isActive ? 8 : 7}
                  fontWeight={isActive ? 600 : 400}
                  className={
                    isActive
                      ? "fill-primary pointer-events-none select-none"
                      : "fill-muted-foreground pointer-events-none select-none"
                  }
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
