import { memo, useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import {
  FileText,
  Scissors,
  Cpu,
  Database,
  GitBranch,
  Search,
  ArrowUpDown,
  MessageSquare,
  CheckCircle2,
  Code2,
  Link2,
} from "lucide-react";
import type { NodeType } from "../../types";

const nodeIcons: Record<NodeType, React.ElementType> = {
  document_loader: FileText,
  chunker: Scissors,
  embedder: Cpu,
  vector_store: Database,
  graph_store: GitBranch,
  retriever: Search,
  reranker: ArrowUpDown,
  llm: MessageSquare,
  evaluation: CheckCircle2,
};

const nodeColors: Record<NodeType, { bg: string; border: string; icon: string }> = {
  document_loader: { bg: "bg-blue-500/10",    border: "border-blue-500/30",    icon: "text-blue-400" },
  chunker:         { bg: "bg-amber-500/10",   border: "border-amber-500/30",   icon: "text-amber-400" },
  embedder:        { bg: "bg-purple-500/10",  border: "border-purple-500/30",  icon: "text-purple-400" },
  vector_store:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    icon: "text-cyan-400" },
  graph_store:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-400" },
  retriever:       { bg: "bg-orange-500/10",  border: "border-orange-500/30",  icon: "text-orange-400" },
  reranker:        { bg: "bg-pink-500/10",    border: "border-pink-500/30",    icon: "text-pink-400" },
  llm:             { bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  icon: "text-indigo-400" },
  evaluation:      { bg: "bg-green-500/10",   border: "border-green-500/30",   icon: "text-green-400" },
};

const nodeTypeLabels: Record<NodeType, string> = {
  document_loader: "Document Loader",
  chunker:         "Chunker",
  embedder:        "Embedder",
  vector_store:    "Vector Store",
  graph_store:     "Graph Store",
  retriever:       "Retriever",
  reranker:        "Re-Ranker",
  llm:             "LLM",
  evaluation:      "Evaluation",
};

export { nodeTypeLabels, nodeIcons, nodeColors };

interface SystemNodeData {
  label: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  codeComponentId?: string;
  inputs?: string[];
  outputs?: string[];
  [key: string]: unknown;
}

function SystemNodeComponent({ data, selected, id }: NodeProps<any>) {
  const nodeData = data as SystemNodeData;
  const nodeType = nodeData.nodeType;
  const colors = nodeColors[nodeType];
  const Icon = nodeIcons[nodeType];

  const { setNodes } = useReactFlow();

  // ── Inline rename ──────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(nodeData.label);
      setIsEditing(true);
    },
    [nodeData.label]
  );

  const commitRename = useCallback(() => {
    const name = editValue.trim() || nodeData.label;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: name } } : n
      )
    );
    setIsEditing(false);
  }, [editValue, nodeData.label, id, setNodes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitRename();
      if (e.key === "Escape") {
        setEditValue(nodeData.label);
        setIsEditing(false);
      }
      e.stopPropagation();
    },
    [commitRename, nodeData.label]
  );

  const hasCodeComponent = !!nodeData.codeComponentId;
  const hasConnections =
    (nodeData.inputs?.length ?? 0) + (nodeData.outputs?.length ?? 0) > 0;

  return (
    <div
      className={`rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm px-4 py-3 min-w-[200px] cursor-pointer transition-all ${
        selected
          ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20"
          : "hover:shadow-md hover:shadow-black/30"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#30363d] !border-2 !border-[#484f58]"
      />

      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label — double-click to rename */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-[#0d1117] border border-indigo-500 rounded px-1 text-[12px] text-white outline-none"
              style={{ minWidth: 0, maxWidth: 140 }}
            />
          ) : (
            <div
              onDoubleClick={startEdit}
              title="Double-click to rename"
              className="text-[12px] text-white truncate"
            >
              {nodeData.label}
            </div>
          )}

          <div className="text-[10px] text-[#8b949e]">{nodeTypeLabels[nodeType]}</div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 mt-2">
        {hasCodeComponent && (
          <span className="flex items-center gap-0.5 text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
            <Code2 className="w-2.5 h-2.5" />
            code
          </span>
        )}
        {hasConnections && (
          <span className="flex items-center gap-0.5 text-[9px] text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded-full">
            <Link2 className="w-2.5 h-2.5" />
            {nodeData.inputs?.length ?? 0}→{nodeData.outputs?.length ?? 0}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#30363d] !border-2 !border-[#484f58]"
      />
    </div>
  );
}

export const MemoizedSystemNode = memo(SystemNodeComponent);

export const customNodeTypes = {
  systemNode: MemoizedSystemNode,
};
