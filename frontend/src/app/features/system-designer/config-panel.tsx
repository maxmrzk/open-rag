import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  X,
  Save,
  RotateCcw,
  Code2,
  Settings2,
  Package,
  Link2,
  LinkIcon,
  Check,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { SystemNode, CodeComponent } from "../../types";
import { CODE_REQUIRED_NODES, IMPORT_NODES } from "../../types";
import { nodeTypeLabels, nodeIcons, nodeColors } from "./node-types";
import { useComponentLibrary } from "../../hooks/useComponentLibrary";

// ── HuggingFace quick-import presets ────────────────────────────────────────

const HF_PRESETS: Record<string, { label: string; model: string; desc: string }[]> = {
  reranker: [
    {
      label: "MiniLM-L-6 (fast)",
      model: "cross-encoder/ms-marco-MiniLM-L-6-v2",
      desc: "~80 MB · MS-MARCO",
    },
    {
      label: "MiniLM-L-12 (balanced)",
      model: "cross-encoder/ms-marco-MiniLM-L-12-v2",
      desc: "~130 MB · MS-MARCO",
    },
    {
      label: "ELECTRA base (best)",
      model: "cross-encoder/ms-marco-electra-base",
      desc: "~440 MB · MS-MARCO",
    },
    { label: "BGE-reranker-base", model: "BAAI/bge-reranker-base", desc: "~270 MB · multilingual" },
    {
      label: "BGE-reranker-large",
      model: "BAAI/bge-reranker-large",
      desc: "~1.3 GB · highest quality",
    },
  ],
  graph_store: [
    { label: "Neo4j (bolt)", model: "neo4j://localhost:7687", desc: "Production graph DB" },
    { label: "NetworkX (in-memory)", model: "networkx://local", desc: "No external dependency" },
    { label: "Amazon Neptune", model: "neptune://cluster-endpoint", desc: "Managed AWS graph DB" },
  ],
  vector_store: [
    { label: "Qdrant (local)", model: "http://localhost:6333", desc: "Self-hosted, recommended" },
    { label: "Chroma (local)", model: "http://localhost:8000", desc: "Lightweight, easy start" },
    { label: "Pinecone", model: "pinecone://your-index", desc: "Managed, serverless" },
    { label: "Weaviate", model: "http://localhost:8080", desc: "GraphQL + vector" },
  ],
};

// ── Provider badge colors ────────────────────────────────────────────────────
const providerColors: Record<string, string> = {
  openai: "text-green-400 bg-green-500/10 border-green-500/20",
  google: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  anthropic: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  cohere: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  huggingface: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  langchain: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  custom: "text-[#8b949e] bg-[#21262d] border-[#30363d]",
};

// ---------------------------------------------------------------------------

interface ConfigPanelProps {
  node: SystemNode | null;
  onClose: () => void;
  onSave: (nodeId: string, config: Record<string, unknown>, codeComponentId?: string) => void;
}

type Tab = "config" | "code" | "library";

export function ConfigPanel({ node, onClose, onSave }: ConfigPanelProps) {
  const navigate = useNavigate();
  const { getByNodeType, getById } = useComponentLibrary();

  const [tab, setTab] = useState<Tab>("config");
  const [configText, setConfigText] = useState("");
  const [hasConfigChanges, setHasConfigChanges] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined);
  const [codeText, setCodeText] = useState("");
  const [hasCodeChanges, setHasCodeChanges] = useState(false);

  const [hfPresetOpen, setHfPresetOpen] = useState(false);

  useEffect(() => {
    if (node) {
      setConfigText(JSON.stringify(node.config, null, 2));
      setHasConfigChanges(false);
      setParseError(null);
      setSelectedComponentId(node.codeComponentId);
      setHasCodeChanges(false);
      // Load code from linked component
      const comp = node.codeComponentId ? getById(node.codeComponentId) : undefined;
      setCodeText(comp?.code ?? "");
    }
  }, [node, getById]);

  // When selected component changes, load its code — do NOT reset hasCodeChanges
  // (link-change dirty is derived via selectedComponentId !== node.codeComponentId)
  useEffect(() => {
    if (selectedComponentId) {
      const comp = getById(selectedComponentId);
      setCodeText(comp?.code ?? "");
    } else {
      setCodeText("");
    }
  }, [selectedComponentId, getById]);

  if (!node) return null;

  const Icon = nodeIcons[node.type];
  const colors = nodeColors[node.type];
  const needsCode = CODE_REQUIRED_NODES.includes(node.type);
  const isImportNode = IMPORT_NODES.includes(node.type);
  const nodeComponents = getByNodeType(node.type);
  const linkedComponent = selectedComponentId ? getById(selectedComponentId) : null;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSaveAll = () => {
    try {
      const parsed = JSON.parse(configText);
      onSave(node.id, parsed, selectedComponentId);
      setHasConfigChanges(false);
      setHasCodeChanges(false);
      setParseError(null);
    } catch {
      setParseError("Invalid JSON in Config tab");
      setTab("config");
    }
  };

  const handleResetConfig = () => {
    setConfigText(JSON.stringify(node.config, null, 2));
    setHasConfigChanges(false);
    setParseError(null);
  };

  const handleLinkComponent = (comp: CodeComponent) => {
    setSelectedComponentId(comp.id);
    setHasCodeChanges(true);
    setTab("code");
  };

  const handleUnlinkComponent = () => {
    setSelectedComponentId(undefined);
    setCodeText("");
    setHasCodeChanges(true);
  };

  // Whether the linked component differs from what's persisted on the node
  const isLinkChanged = selectedComponentId !== node.codeComponentId;
  const isDirty = hasConfigChanges || hasCodeChanges || isLinkChanged;

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "config", label: "Config", icon: Settings2 },
    ...(needsCode || isImportNode ? [{ id: "code" as Tab, label: "Code", icon: Code2 }] : []),
    { id: "library", label: "Library", icon: Package },
  ];

  return (
    <div className="w-[460px] bg-[#0d1117] border-l border-[#21262d] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] text-white truncate">{node.name}</div>
            <div className="text-[10px] text-[#8b949e]">{nodeTypeLabels[node.type]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && <span className="text-[10px] text-amber-400 shrink-0">Unsaved</span>}
          <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] transition-colors">
            <X className="w-4 h-4 text-[#8b949e]" />
          </button>
        </div>
      </div>

      {/* Connection info */}
      {(node.inputs?.length ?? 0) + (node.outputs?.length ?? 0) > 0 && (
        <div className="px-4 py-2 border-b border-[#21262d] flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
            <Link2 className="w-3 h-3 text-[#484f58]" />
            <span className="text-[#484f58]">In:</span>
            {node.inputs?.length ? (
              node.inputs.map((id) => (
                <code
                  key={id}
                  className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 rounded"
                >
                  {id}
                </code>
              ))
            ) : (
              <span className="text-[#484f58] italic">none</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
            <span className="text-[#484f58]">Out:</span>
            {node.outputs?.length ? (
              node.outputs.map((id) => (
                <code
                  key={id}
                  className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded"
                >
                  {id}
                </code>
              ))
            ) : (
              <span className="text-[#484f58] italic">none</span>
            )}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-[#21262d] shrink-0">
        {tabs.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] border-b-2 transition-colors ${
              tab === id
                ? "border-indigo-500 text-white"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── CONFIG TAB ─────────────────────────────────────────────────────── */}
      {tab === "config" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262d] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#8b949e] uppercase tracking-wider">
              Node Configuration (JSON)
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={configText}
              onChange={(value) => {
                setConfigText(value || "");
                setHasConfigChanges(true);
                try {
                  JSON.parse(value || "");
                  setParseError(null);
                } catch {
                  setParseError("Invalid JSON");
                }
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8 },
                renderLineHighlight: "gutter",
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      )}

      {/* ── CODE TAB ──────────────────────────────────────────────────────── */}
      {tab === "code" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Linked component banner */}
          {linkedComponent ? (
            <div className="px-4 py-2.5 border-b border-[#21262d] flex items-center justify-between shrink-0 bg-[#161b22]">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] text-white truncate">{linkedComponent.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {linkedComponent.provider && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                          providerColors[linkedComponent.provider] ?? providerColors.custom
                        }`}
                      >
                        {linkedComponent.provider}
                      </span>
                    )}
                    {linkedComponent.envVars?.map((v) => (
                      <code
                        key={v}
                        className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => navigate("/app/library")}
                  className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={handleUnlinkComponent}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2.5 border-b border-[#21262d] flex items-center justify-between shrink-0 bg-[#0d1117]">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#484f58] shrink-0" />
                <span className="text-[11px] text-[#484f58]">
                  {needsCode
                    ? "No component linked — select one from the Library tab"
                    : "Configure the import/provider below"}
                </span>
              </div>
              {needsCode && (
                <button
                  onClick={() => setTab("library")}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Browse →
                </button>
              )}
            </div>
          )}

          {/* HuggingFace quick presets for import-type nodes */}
          {isImportNode && HF_PRESETS[node.type] && (
            <div className="border-b border-[#21262d] shrink-0">
              <button
                onClick={() => setHfPresetOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-yellow-400" />
                  Quick Import Presets
                </span>
                {hfPresetOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {hfPresetOpen && (
                <div className="px-4 pb-3 space-y-1">
                  {HF_PRESETS[node.type].map((preset) => (
                    <button
                      key={preset.model}
                      onClick={() => {
                        // Insert model into config JSON
                        try {
                          const cfg = JSON.parse(configText);
                          cfg.model = preset.model;
                          setConfigText(JSON.stringify(cfg, null, 2));
                          setHasConfigChanges(true);
                        } catch {
                          // ignore
                        }
                        // Generate boilerplate code in the editor
                        const code = generatePresetCode(node.type, preset.model);
                        setCodeText(code);
                        setHasCodeChanges(true);
                        setHfPresetOpen(false);
                        toast(`Applied: ${preset.label}`);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-[#161b22] hover:bg-[#21262d] transition-colors group"
                    >
                      <div className="text-left">
                        <div className="text-[12px] text-white">{preset.label}</div>
                        <div className="text-[10px] text-[#484f58]">{preset.model}</div>
                      </div>
                      <span className="text-[10px] text-[#484f58] group-hover:text-[#8b949e]">
                        {preset.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requirements hint */}
          {linkedComponent?.requirements && (
            <div className="px-4 py-1.5 border-b border-[#21262d] shrink-0 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#484f58] shrink-0">pip:</span>
              {linkedComponent.requirements.map((r) => (
                <code
                  key={r}
                  className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded"
                >
                  {r}
                </code>
              ))}
            </div>
          )}

          {/* Monaco Python editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="python"
              value={codeText}
              onChange={(value) => {
                setCodeText(value || "");
                setHasCodeChanges(true);
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8 },
                renderLineHighlight: "gutter",
                automaticLayout: true,
                readOnly: linkedComponent?.isBuiltin && !hasCodeChanges,
              }}
            />
          </div>
          {linkedComponent?.isBuiltin && (
            <div className="px-4 py-1.5 border-t border-[#21262d] shrink-0">
              <p className="text-[10px] text-[#484f58]">
                Built-in component — edits will only affect this node. Go to{" "}
                <button
                  onClick={() => navigate("/app/library")}
                  className="text-indigo-400 hover:underline"
                >
                  Component Library
                </button>{" "}
                to create a custom copy.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── LIBRARY TAB ───────────────────────────────────────────────────── */}
      {tab === "library" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-[#21262d] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#8b949e] uppercase tracking-wider">
              Components for {nodeTypeLabels[node.type]}
            </span>
            <button
              onClick={() => navigate("/app/library")}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Full Library
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {nodeComponents.length === 0 ? (
              <div className="text-center py-8 text-[#484f58] text-[12px]">
                No components for this node type.
                <br />
                <button
                  onClick={() => navigate("/app/library")}
                  className="mt-2 text-indigo-400 hover:underline"
                >
                  Create one in the Library →
                </button>
              </div>
            ) : (
              nodeComponents.map((comp) => {
                const isLinked = comp.id === selectedComponentId;
                return (
                  <div
                    key={comp.id}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${
                      isLinked
                        ? "border-indigo-500/50 bg-indigo-500/5"
                        : "border-[#21262d] bg-[#161b22] hover:border-[#30363d]"
                    }`}
                    onClick={() => handleLinkComponent(comp)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] text-white truncate">{comp.name}</span>
                          {comp.isDefault && (
                            <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                              default
                            </span>
                          )}
                          {comp.isBuiltin && (
                            <span className="text-[9px] text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded-full border border-[#30363d]">
                              built-in
                            </span>
                          )}
                          {comp.provider && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                                providerColors[comp.provider] ?? providerColors.custom
                              }`}
                            >
                              {comp.provider}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8b949e] mt-0.5 line-clamp-2">
                          {comp.description}
                        </p>
                      </div>
                      {isLinked ? (
                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5 text-[#484f58] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>

                    {comp.envVars && comp.envVars.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-[9px] text-[#484f58]">env:</span>
                        {comp.envVars.map((v) => (
                          <code
                            key={v}
                            className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded"
                          >
                            {v}
                          </code>
                        ))}
                      </div>
                    )}

                    {comp.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {comp.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#21262d] flex items-center justify-between shrink-0">
        {parseError ? (
          <span className="text-[11px] text-red-400">{parseError}</span>
        ) : (
          <span className="text-[10px] text-[#484f58]">
            {linkedComponent
              ? `🔗 ${linkedComponent.name}`
              : needsCode
                ? "No component linked"
                : nodeTypeLabels[node.type]}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetConfig}
            disabled={!hasConfigChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!isDirty || !!parseError}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate boilerplate code for HuggingFace/preset imports */
function generatePresetCode(nodeType: string, model: string): string {
  if (nodeType === "reranker") {
    return `from sentence_transformers import CrossEncoder

# Model: ${model}
model = CrossEncoder("${model}")


def rerank(query: str, documents: list[str], top_k: int = 5) -> list[dict]:
    """Rerank documents using a cross-encoder model."""
    pairs = [[query, doc] for doc in documents]
    scores = model.predict(pairs)
    ranked = sorted(
        [{"text": doc, "score": float(score)} for doc, score in zip(documents, scores)],
        key=lambda x: x["score"],
        reverse=True,
    )
    return ranked[:top_k]
`;
  }
  if (nodeType === "graph_store") {
    if (model.startsWith("networkx")) {
      return `import networkx as nx
import pickle

G: nx.DiGraph = nx.DiGraph()


def add_entity(name: str, entity_type: str) -> None:
    G.add_node(name, type=entity_type)


def add_relation(source: str, relation: str, target: str) -> None:
    G.add_edge(source, target, relation=relation)


def save_graph(path: str = "graph.pkl") -> None:
    with open(path, "wb") as f:
        pickle.dump(G, f)
`;
    }
    return `from neo4j import GraphDatabase
import os

driver = GraphDatabase.driver(
    "${model}",
    auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password")),
)


def add_entity(name: str, entity_type: str) -> None:
    with driver.session() as session:
        session.run(
            "MERGE (e:Entity {name: $name}) SET e.type = $type",
            name=name, type=entity_type,
        )
`;
  }
  if (nodeType === "vector_store") {
    return `from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

client = QdrantClient(url="${model}")


def create_collection(name: str, vector_size: int = 1536) -> None:
    client.recreate_collection(
        collection_name=name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


def upsert_vectors(collection: str, ids: list, vectors: list, payloads: list) -> None:
    from qdrant_client.models import PointStruct
    client.upsert(
        collection_name=collection,
        points=[PointStruct(id=i, vector=v, payload=p) for i, v, p in zip(ids, vectors, payloads)],
    )
`;
  }
  return `# ${model}\n# Configure your integration here\n`;
}
