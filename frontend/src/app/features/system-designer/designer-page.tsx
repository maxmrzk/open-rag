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
  FolderOpen,
  BookOpen,
  FolderKanban,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSystem, useUpdateSystem, useCreateSystem as _useCreateSystem } from "../../hooks/useSystems";
import { useProjects, useCreateProject } from "../../hooks/useProjects";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { useCreateRun } from "../../hooks/useRuns";
import { apiClient } from "../../api/client";
import { customNodeTypes, nodeTypeLabels } from "./node-types";
import { NodePalette, PALETTE_DND_TYPE } from "./node-palette";
import type { PaletteDragItem } from "./node-palette";
import { ConfigPanel } from "./config-panel";
import { DockerExportModal } from "./docker-export-modal";
import type { NodeType, SystemNode } from "../../types";
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
  const projectIdParam = searchParams.get("projectId") ?? undefined;

  const { data: system } = useSystem(systemId);
  const updateSystem = useUpdateSystem(systemId ?? "");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

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

  const createRun = useCreateRun(systemId ?? "");

  const handleRunSystem = () => {
    if (system?.id) {
      setShowRunModal(true);
    } else {
      toast.error("Save the system to a project first before running");
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

            {/* Save to Project */}
            <button
              onClick={() => setShowSaveModal(true)}
              title={system?.id ? "Save system to project" : "Save to a project"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              {system?.id ? "Save" : "Save to Project"}
            </button>

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

      {showRunModal && (
        <RunModal
          systemId={system?.id ?? ""}
          systemName={system?.name ?? ""}
          createRun={createRun}
          onClose={() => setShowRunModal(false)}
          onSuccess={() => {
            setShowRunModal(false);
            queryClient.invalidateQueries({ queryKey: ["runs"] });
            navigate(`/app/runs?systemId=${system?.id}`);
          }}
        />
      )}

      {showSaveModal && (
        <SaveToProjectModal
          currentSystem={system ?? null}
          currentNodes={nodes}
          currentEdges={edges}
          onClose={() => setShowSaveModal(false)}
          onSaved={(newSystemId) => {
            setShowSaveModal(false);
            if (newSystemId && newSystemId !== system?.id) {
              navigate(`/app/designer?systemId=${newSystemId}`);
            } else {
              persistToBackend(nodes, edges);
              toast.success("System saved");
            }
            queryClient.invalidateQueries({ queryKey: ["systems"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
          projectIdParam={projectIdParam}
        />
      )}

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-[#484f58] pointer-events-none select-none">
        <Save className="w-3 h-3" />
        Double-click any node label to rename · Ctrl+Z/Y to undo/redo
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run Modal — prompt/document input before starting a run
// ---------------------------------------------------------------------------

function RunModal({
  systemId,
  systemName,
  createRun,
  onClose,
  onSuccess,
}: {
  systemId: string;
  systemName: string;
  createRun: ReturnType<typeof useCreateRun>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [promptInput, setPromptInput] = useState("");

  const handleRun = () => {
    if (!systemId) return;
    createRun.mutate(
      { promptInput: promptInput.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Run started for "${systemName}"`);
          onSuccess();
        },
        onError: () => {
          toast.error("Failed to start run — is the backend running?");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-4 h-4 text-green-400" />
          <h2 className="text-[16px] text-white">Run System</h2>
        </div>
        <p className="text-[12px] text-[#8b949e] mb-4">
          The <span className="text-cyan-400">Document Loader</span> node will receive the text you
          paste below as input. Leave blank to use a synthetic benchmark dataset.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">
              Prompt / Document Input{" "}
              <span className="text-[10px] text-[#484f58]">(optional)</span>
            </label>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Paste your PDF content, document text, or evaluation query here…"
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[12px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-green-500 resize-none font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={createRun.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[13px] transition-colors disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            {createRun.isPending ? "Starting…" : "Start Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save to Project Modal
// ---------------------------------------------------------------------------

function SaveToProjectModal({
  currentSystem,
  currentNodes,
  currentEdges,
  onClose,
  onSaved,
  projectIdParam,
}: {
  currentSystem: { id: string; projectId: string; name: string } | null;
  currentNodes: Node[];
  currentEdges: Edge[];
  onClose: () => void;
  onSaved: (newSystemId?: string) => void;
  projectIdParam?: string;
}) {
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentSystem?.projectId ?? projectIdParam ?? ""
  );
  const [isNewProject, setIsNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [systemName, setSystemName] = useState(currentSystem?.name ?? "My RAG System");
  const [isSaving, setIsSaving] = useState(false);

  const effectiveProjectId = isNewProject ? "" : selectedProjectId;
  const isExistingSystem = !!currentSystem?.id && selectedProjectId === currentSystem?.projectId;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let projectId = effectiveProjectId;

      // Create project if needed
      if (isNewProject) {
        if (!newProjectName.trim()) {
          toast.error("Project name is required");
          setIsSaving(false);
          return;
        }
        const newProject = await createProject.mutateAsync({
          name: newProjectName.trim(),
        });
        projectId = newProject.id;
      }

      if (!projectId) {
        toast.error("Please select or create a project");
        setIsSaving(false);
        return;
      }

      if (isExistingSystem) {
        // Already in right project — signal to parent to auto-save
        onSaved(undefined);
        return;
      }

      // Build payload
      const systemNodes = flowNodesToSystemNodes(currentNodes, currentEdges);
      const systemEdgesPayload = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      const response: any = await apiClient.post(`/projects/${projectId}/systems`, {
        name: systemName.trim() || "RAG System",
        nodes: systemNodes,
        edges: systemEdgesPayload,
      });

      const newSystemId: string = response?.data?.id ?? response?.id;
      onSaved(newSystemId);
      toast.success(`Saved "${systemName}" to project`);
    } catch {
      toast.error("Failed to save system");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          <h2 className="text-[16px] text-white">Save to Project</h2>
        </div>

        <div className="space-y-3">
          {/* System name */}
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">System Name</label>
            <input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="e.g., Customer Support RAG"
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Project picker */}
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">Project</label>
            <select
              value={isNewProject ? "__new__" : selectedProjectId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setIsNewProject(true);
                  setSelectedProjectId("");
                } else {
                  setIsNewProject(false);
                  setSelectedProjectId(e.target.value);
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">— Select a project —</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="__new__">+ Create new project…</option>
            </select>
          </div>

          {/* New project name */}
          {isNewProject && (
            <div>
              <label className="block text-[12px] text-[#8b949e] mb-1.5">New Project Name</label>
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Customer Support"
                className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
          )}

          {isExistingSystem && (
            <p className="text-[11px] text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
              This system is already saved in this project. Clicking Save will persist the current
              canvas state.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (!isNewProject && !selectedProjectId)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors disabled:opacity-40"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
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
