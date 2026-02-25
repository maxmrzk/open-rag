import { useDrag } from "react-dnd";
import { GripVertical } from "lucide-react";
import type { NodeType } from "../../types";
import { nodeIcons, nodeColors, nodeTypeLabels } from "./node-types";

// ---------------------------------------------------------------------------
// DnD constants exported so the drop zone can share the same type token
// ---------------------------------------------------------------------------

export const PALETTE_DND_TYPE = "PALETTE_NODE" as const;

export interface PaletteDragItem {
  nodeType: NodeType;
}

// ---------------------------------------------------------------------------
// Category groupings
// ---------------------------------------------------------------------------

const nodeCategories: { label: string; types: NodeType[] }[] = [
  { label: "Ingestion", types: ["document_loader", "chunker"] },
  { label: "Embedding & Storage", types: ["embedder", "vector_store", "graph_store"] },
  { label: "Retrieval", types: ["retriever", "reranker"] },
  { label: "Generation & Eval", types: ["llm", "evaluation"] },
];

// ---------------------------------------------------------------------------
// Single draggable item
// ---------------------------------------------------------------------------

interface DraggableItemProps {
  type: NodeType;
  onAddNode: (type: NodeType) => void;
}

function DraggableItem({ type, onAddNode }: DraggableItemProps) {
  const Icon = nodeIcons[type];
  const colors = nodeColors[type];

  const [{ isDragging }, drag] = useDrag<
    PaletteDragItem,
    void,
    { isDragging: boolean }
  >({
    type: PALETTE_DND_TYPE,
    item: { nodeType: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      onClick={() => onAddNode(type)}
      title="Click to add or drag onto canvas"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="group cursor-grab active:cursor-grabbing w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-[#c9d1d9] hover:bg-[#161b22] transition-colors select-none"
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${colors.bg}`}>
        <Icon className={`w-3 h-3 ${colors.icon}`} />
      </div>
      <span className="flex-1 truncate">{nodeTypeLabels[type]}</span>
      <GripVertical className="w-3 h-3 text-[#484f58] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Palette panel
// ---------------------------------------------------------------------------

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="absolute top-4 left-4 z-20 bg-[#0d1117]/95 backdrop-blur-md border border-[#21262d] rounded-xl p-3 w-52 shadow-xl shadow-black/40">
      <div className="flex items-baseline gap-1.5 mb-2.5 px-1">
        <span className="text-[11px] text-[#8b949e] uppercase tracking-wider">
          Components
        </span>
        <span className="text-[9px] text-[#484f58]">drag or click</span>
      </div>

      <div className="space-y-3">
        {nodeCategories.map((cat) => (
          <div key={cat.label}>
            <div className="text-[10px] text-[#484f58] uppercase tracking-wider mb-1 px-1">
              {cat.label}
            </div>
            <div className="space-y-0.5">
              {cat.types.map((type) => (
                <DraggableItem key={type} type={type} onAddNode={onAddNode} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#21262d] px-1">
        <p className="text-[10px] text-[#484f58] leading-relaxed">
          Drag onto the canvas to place precisely.
        </p>
      </div>
    </div>
  );
}
