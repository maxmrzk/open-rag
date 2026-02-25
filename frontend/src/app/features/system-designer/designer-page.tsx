import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDrop, useDragLayer } from "react-dnd";
import {
  Play,
  CheckCircle,
  Container,
  Undo2,
  Redo2,
  MousePointer2,
  Save,
  Upload,
  Download,
  BookOpen,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem, useUpdateSystem } from "../../hooks/useSystems";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { useComponentLibrary } from "../../hooks/useComponentLibrary";
import { apiClient } from "../../api/client";
import { customNodeTypes, nodeTypeLabels } from "./node-types";
import { NodePalette, PALETTE_DND_TYPE } from "./node-palette";
import type { PaletteDragItem } from "./node-palette";
import { ConfigPanel } from "./config-panel";
import { DockerExportModal } from "./docker-export-modal";
import type { NodeType, SystemNode, SystemExport } from "../../types";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers — convert between domain types and ReactFlow types
// ---------------------------------------------------------------------------

function systemNodesToFlowNodes(systemNodes: SystemNode[]): Node[] {
  return systemNodes.map((n) => ({
    id: n.id,
    type: "systemNode",
    position: n.position,
    data: {
      label: n.name,
      nodeType: n.type,
      config: n.config,
      codeComponentId: n.codeComponentId,
      inputs: n.inputs ?? [],
      outputs: n.outputs ?? [],
    },
  }));
}

function systemEdgesToFlowEdges(
  systemEdges: { id: string; source: string; target: string }[]
): Edge[] {
  return systemEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: "#30363d", strokeWidth: 2 },
  }));
}

/** Sync input/output edge IDs into every node's data */
function syncConnections(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      inputs: edges.filter((e) => e.target === node.id).map((e) => e.id),
      outputs: edges.filter((e) => e.source === node.id).map((e) => e.id),
    },
  }));
}

/** Convert current flow state back to a domain SystemNode[] */
function flowNodesToSystemNodes(nodes: Node[], edges: Edge[]): SystemNode[] {
  const synced = syncConnections(nodes, edges);
  return synced.map((n) => ({
    id: n.id,
    type: (n.data as any).nodeType as NodeType,
    name: (n.data as any).label as string,
    config: (n.data as any).config ?? {},
    codeComponentId: (n.data as any).codeComponentId,
    inputs: (n.data as any).inputs ?? [],
    outputs: (n.data as any).outputs ?? [],
    position: n.position,
  }));
}

// ---------------------------------------------------------------------------
// Canvas drop zone
// ---------------------------------------------------------------------------

interface CanvasDropZoneProps {
  onDropNode: (type: NodeType, position: XYPosition) => void;
}

function CanvasDropZone({ onDropNode }: CanvasDropZoneProps) {
  const { screenToFlowPosition } = useReactFlow();

  const { isDraggingFromPalette } = useDragLayer((monitor) => ({
    isDraggingFromPalette: monitor.isDragging() && monitor.getItemType() === PALETTE_DND_TYPE,
  }));

  const [{ isOver, canDrop }, drop] = useDrop<
    PaletteDragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: PALETTE_DND_TYPE,
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const position = screenToFlowPosition({ x: offset.x, y: offset.y });
      onDropNode(item.nodeType, position);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      style={{ pointerEvents: isDraggingFromPalette ? "all" : "none" }}
      className={[
        "absolute inset-0 z-10 transition-all duration-150",
        isOver && canDrop ? "ring-2 ring-inset ring-indigo-500/40 bg-indigo-500/5" : "",
      ].join(" ")}
    >
      {isOver && canDrop && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 bg-indigo-600/90 backdrop-blur-sm text-white text-[12px] px-4 py-2 rounded-full shadow-xl">
          <MousePointer2 className="w-3.5 h-3.5" />
          Release to place node
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main designer content
// ---------------------------------------------------------------------------

function DesignerContent() {
  const [searchParams] = useSearchParams();
  const systemId = searchParams.get("systemId") ?? undefined;

  const { data: system } = useSystem(systemId);
  const updateSystem = useUpdateSystem(systemId ?? "");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { components } = useComponentLibrary();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDockerModal, setShowDockerModal] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { pushHistory, undo, redo, canUndo, canRedo } = useUndoRedo();

  // Sync from backend on load
  useEffect(() => {
    if (system) {
      const flowNodes = systemNodesToFlowNodes(system.nodes);
      const flowEdges = systemEdgesToFlowEdges(system.edges);
      setNodes(syncConnections(flowNodes, flowEdges));
      setEdges(flowEdges);
    }
  }, [system, setNodes, setEdges]);

  // ── Persist to backend ─────────────────────────────────────────────────────

  const persistToBackend = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (!system?.id) return;
      const systemNodes = flowNodesToSystemNodes(currentNodes, currentEdges);
      const systemEdges = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));
      updateSystem.mutate(
        { name: system.name, nodes: systemNodes as any, edges: systemEdges },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["system", system.id] });
          },
        }
      );
    },
    [system, updateSystem, queryClient]
  );

  // ── Run System ──────────────────────────────────────────────────────────────

  const { mutate: startRun } = useMutation({
    mutationFn: () => apiClient.post(`/systems/${system?.id}/runs`, {}),
    onSuccess: () => {
      toast.success("Evaluation run started");
      queryClient.invalidateQueries({ queryKey: ["runs", system?.id] });
    },
    onError: () => {
      toast.error("Failed to start run — is the backend running?");
    },
  });

  const handleRunSystem = () => {
    if (system?.id) {
      startRun();
    } else {
      toast.error("No system loaded");
    }
  };

  // ── Undo / Redo ──────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    const prev = undo({ nodes, edges });
    if (prev) {
      setNodes(prev.nodes);
      setEdges(prev.edges);
    }
  }, [nodes, edges, undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const next = redo({ nodes, edges });
    if (next) {
      setNodes(next.nodes);
      setEdges(next.edges);
    }
  }, [nodes, edges, redo, setNodes, setEdges]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  // ── Node / edge operations ────────────────────────────────────────────────

  const handleAddNode = useCallback(
    (type: NodeType, position?: XYPosition) => {
      pushHistory({ nodes, edges });
      const id = `node-${Date.now()}`;
      const newNode: Node = {
        id,
        type: "systemNode",
        position: position ?? {
          x: 350 + Math.random() * 250,
          y: 150 + Math.random() * 250,
        },
        data: {
          label: nodeTypeLabels[type],
          nodeType: type,
          config: {},
          codeComponentId: undefined,
          inputs: [],
          outputs: [],
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
      toast.success(`Added "${nodeTypeLabels[type]}" node`);
    },
    [nodes, edges, pushHistory, setNodes]
  );

  const dragStartSnapshotRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const handleNodeDragStart = useCallback(() => {
    dragStartSnapshotRef.current = { nodes, edges };
  }, [nodes, edges]);

  const handleNodeDragStop = useCallback(() => {
    if (dragStartSnapshotRef.current) {
      pushHistory(dragStartSnapshotRef.current);
      dragStartSnapshotRef.current = null;
    }
  }, [pushHistory]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((c) => c.type === "remove")) {
        pushHistory({ nodes, edges });
      }
      onNodesChange(changes);
    },
    [nodes, edges, pushHistory, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) {
        pushHistory({ nodes, edges });
        // After removal, re-sync connection IDs in nodes
        onEdgesChange(changes);
        setEdges((currentEdges) => {
          setNodes((currentNodes) => syncConnections(currentNodes, currentEdges));
          return currentEdges;
        });
        return;
      }
      onEdgesChange(changes);
    },
    [nodes, edges, pushHistory, onEdgesChange, setEdges, setNodes]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      pushHistory({ nodes, edges });
      setEdges((eds) => {
        const newEdges = addEdge(
          { ...params, animated: true, style: { stroke: "#30363d", strokeWidth: 2 } },
          eds
        );
        // Sync connection IDs into affected nodes
        setNodes((nds) => syncConnections(nds, newEdges));
        return newEdges;
      });
    },
    [nodes, edges, pushHistory, setEdges, setNodes]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleSaveConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>, codeComponentId?: string) => {
      pushHistory({ nodes, edges });
      const updatedNodes = nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                config,
                ...(codeComponentId !== undefined ? { codeComponentId } : {}),
              },
            }
          : n
      );
      setNodes(updatedNodes);
      persistToBackend(updatedNodes, edges);
      toast.success("Configuration saved");
    },
    [nodes, edges, pushHistory, setNodes, persistToBackend]
  );

  const selectedSystemNode: SystemNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;
    return {
      id: node.id,
      type: (node.data as any).nodeType,
      name: (node.data as any).label,
      config: (node.data as any).config || {},
      codeComponentId: (node.data as any).codeComponentId,
      inputs: (node.data as any).inputs ?? [],
      outputs: (node.data as any).outputs ?? [],
      position: node.position,
    };
  }, [selectedNodeId, nodes]);

  // ── Save / Load system JSON ───────────────────────────────────────────────

  const handleSaveSetup = useCallback(() => {
    const systemNodes = flowNodesToSystemNodes(nodes, edges);
    const systemEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    // Collect referenced components
    const usedComponentIds = new Set(systemNodes.map((n) => n.codeComponentId).filter(Boolean));
    const usedComponents = components.filter((c) => usedComponentIds.has(c.id));

    const exportData: SystemExport = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      system: {
        name: system?.name ?? "RAG System",
        nodes: systemNodes,
        edges: systemEdges,
      },
      components: usedComponents,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(system?.name ?? "rag-system").toLowerCase().replace(/\s+/g, "-")}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("System exported as JSON");
  }, [nodes, edges, system, components]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSetup = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data: SystemExport = JSON.parse(ev.target?.result as string);
          if (!data.system?.nodes || !data.system?.edges) throw new Error("Invalid format");

          pushHistory({ nodes, edges });
          const flowNodes = systemNodesToFlowNodes(data.system.nodes);
          const flowEdges = systemEdgesToFlowEdges(data.system.edges);
          setNodes(syncConnections(flowNodes, flowEdges));
          setEdges(flowEdges);
          setSelectedNodeId(null);
          toast.success(`Loaded "${data.system.name}" (${flowNodes.length} nodes)`);
        } catch {
          toast.error("Invalid system JSON file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [nodes, edges, pushHistory, setNodes, setEdges]
  );

  const handleValidate = () => toast.success("System validation passed (mock)");

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 border-b border-[#21262d] bg-[#0d1117] flex items-center justify-between px-4 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[14px] text-white truncate">
              {system?.name || "System Designer"}
            </span>
            <span className="text-[10px] text-[#484f58] bg-[#161b22] px-2 py-0.5 rounded shrink-0">
              v{system?.version || 1}
            </span>
            <span className="text-[10px] text-[#484f58]">
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="flex items-center justify-center w-7 h-7 rounded-md text-[#8b949e] hover:text-white hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="flex items-center justify-center w-7 h-7 rounded-md text-[#8b949e] hover:text-white hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Library shortcut */}
            <button
              onClick={() => navigate("/app/library")}
              title="Open Component Library"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Library
            </button>

            {/* Save/Load */}
            <button
              onClick={handleSaveSetup}
              title="Export system as JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-green-400" />
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import system from JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleLoadSetup}
            />

            <button
              onClick={handleValidate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              Validate
            </button>
            <button
              onClick={handleRunSystem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-[12px] transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
            <button
              onClick={() => setShowDockerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <Container className="w-3.5 h-3.5 text-cyan-400" />
              Docker
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative w-full">
          <NodePalette onAddNode={handleAddNode} />

          <CanvasDropZone onDropNode={handleAddNode} />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={customNodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-[#010409] w-full h-full"
            deleteKeyCode={["Delete", "Backspace"]}
          >
            <Controls className="!bg-[#0d1117] !border-[#21262d] !rounded-lg [&>button]:!bg-[#0d1117] [&>button]:!border-[#21262d] [&>button]:!text-[#8b949e] [&>button:hover]:!bg-[#161b22]" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#21262d" />
          </ReactFlow>
        </div>
      </div>

      {selectedNodeId && (
        <ConfigPanel
          node={selectedSystemNode}
          onClose={() => setSelectedNodeId(null)}
          onSave={handleSaveConfig}
        />
      )}

      {showDockerModal && <DockerExportModal onClose={() => setShowDockerModal(false)} />}

      {/* Save icon hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-[#484f58] pointer-events-none select-none">
        <Save className="w-3 h-3" />
        Double-click any node label to rename · Ctrl+Z/Y to undo/redo
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — only ReactFlowProvider scoped here; DndProvider is in App.tsx
// ---------------------------------------------------------------------------

export function DesignerPage() {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <DesignerContent />
      </div>
    </ReactFlowProvider>
  );
}
