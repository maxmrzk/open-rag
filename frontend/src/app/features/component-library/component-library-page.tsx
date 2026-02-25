import { useState, useMemo, useCallback } from "react";
import Editor from "@monaco-editor/react";
import {
  Search,
  Plus,
  Trash2,
  Save,
  Copy,
  X,
  Code2,
  Package,
  Tag,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useComponentLibrary } from "../../hooks/useComponentLibrary";
import type { CodeComponent, NodeType, ComponentProvider } from "../../types";
import { nodeTypeLabels } from "../system-designer/node-types";
import { UnsavedChangesDialog } from "../../components/ui/unsaved-changes-dialog";

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_TYPES: NodeType[] = [
  "document_loader",
  "chunker",
  "embedder",
  "vector_store",
  "graph_store",
  "retriever",
  "reranker",
  "llm",
  "evaluation",
];

const PROVIDER_OPTIONS: { value: ComponentProvider; label: string; color: string }[] =
  [
    { value: "openai", label: "OpenAI", color: "text-green-400" },
    { value: "google", label: "Google", color: "text-blue-400" },
    { value: "anthropic", label: "Anthropic", color: "text-orange-400" },
    { value: "cohere", label: "Cohere", color: "text-teal-400" },
    { value: "huggingface", label: "HuggingFace", color: "text-yellow-400" },
    { value: "langchain", label: "LangChain", color: "text-purple-400" },
    { value: "custom", label: "Custom", color: "text-[#8b949e]" },
  ];

const providerColors: Record<string, string> = {
  openai: "text-green-400 bg-green-500/10 border-green-500/20",
  google: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  anthropic: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  cohere: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  huggingface: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  langchain: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  custom: "text-[#8b949e] bg-[#21262d] border-[#30363d]",
};

const nodeTypeColors: Partial<Record<NodeType, string>> = {
  document_loader: "text-blue-400",
  chunker: "text-amber-400",
  embedder: "text-purple-400",
  vector_store: "text-cyan-400",
  graph_store: "text-emerald-400",
  retriever: "text-orange-400",
  reranker: "text-pink-400",
  llm: "text-indigo-400",
  evaluation: "text-green-400",
};

const DEFAULT_NEW_CODE = `def run(*args, **kwargs):
    """
    Entry point for this component.
    Replace with your Python implementation.
    """
    raise NotImplementedError("Implement this function")
`;

// ── New component form ───────────────────────────────────────────────────────

interface NewComponentForm {
  name: string;
  description: string;
  nodeType: NodeType;
  provider: ComponentProvider;
  tags: string;
  requirements: string;
  envVars: string;
  code: string;
}

const EMPTY_FORM: NewComponentForm = {
  name: "",
  description: "",
  nodeType: "embedder",
  provider: "custom",
  tags: "",
  requirements: "",
  envVars: "",
  code: DEFAULT_NEW_CODE,
};

// ── Component ────────────────────────────────────────────────────────────────

export function ComponentLibraryPage() {
  const { components, addComponent, updateComponent, deleteComponent } =
    useComponentLibrary();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [filterProvider, setFilterProvider] = useState<
    ComponentProvider | "all"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newForm, setNewForm] = useState<NewComponentForm>(EMPTY_FORM);
  const [editedCode, setEditedCode] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Unsaved-changes dialog state ─────────────────────────────────────────
  const [pendingNav, setPendingNav] = useState<
    | { type: "select"; id: string }
    | { type: "create" }
    | null
  >(null);

  // ── Filter components ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return components.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchType = filterType === "all" || c.nodeType === filterType;
      const matchProvider =
        filterProvider === "all" || c.provider === filterProvider;
      return matchSearch && matchType && matchProvider;
    });
  }, [components, search, filterType, filterProvider]);

  const selectedComp = useMemo(
    () => components.find((c) => c.id === selectedId) ?? null,
    [components, selectedId]
  );

  // ── Counts per type ──────────────────────────────────────────────────────

  const countByType = useMemo(() => {
    const map: Record<string, number> = { all: components.length };
    for (const c of components) {
      map[c.nodeType] = (map[c.nodeType] ?? 0) + 1;
    }
    return map;
  }, [components]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (id: string) => {
      if (isDirty) {
        setPendingNav({ type: "select", id });
        return;
      }
      const comp = components.find((c) => c.id === id);
      if (comp) {
        setSelectedId(id);
        setEditedCode(comp.code);
        setIsCreating(false);
        setIsDirty(false);
      }
    },
    [components, isDirty]
  );

  const handleSaveCode = useCallback(() => {
    if (!selectedId) return;
    updateComponent(selectedId, { code: editedCode });
    setIsDirty(false);
    toast.success("Component code saved");
  }, [selectedId, editedCode, updateComponent]);

  const handleDuplicate = useCallback(
    (comp: CodeComponent) => {
      const dup = addComponent({
        ...comp,
        name: `${comp.name} (copy)`,
        isDefault: false,
      });
      setSelectedId(dup.id);
      setEditedCode(dup.code);
      setIsCreating(false);
      toast.success(`Duplicated: ${comp.name}`);
    },
    [addComponent]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (comp?.isBuiltin) {
        toast.error("Cannot delete built-in components");
        return;
      }
      deleteComponent(id);
      if (selectedId === id) {
        setSelectedId(null);
        setIsCreating(false);
      }
      setDeleteConfirm(null);
      toast.success("Component deleted");
    },
    [components, deleteComponent, selectedId]
  );

  const handleCreateSubmit = useCallback(() => {
    if (!newForm.name.trim()) {
      toast.error("Component name is required");
      return;
    }
    const comp = addComponent({
      name: newForm.name.trim(),
      description: newForm.description.trim(),
      nodeType: newForm.nodeType,
      provider: newForm.provider,
      language: "python",
      code: newForm.code,
      isDefault: false,
      tags: newForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      requirements: newForm.requirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      envVars: newForm.envVars
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    });
    setSelectedId(comp.id);
    setEditedCode(comp.code);
    setIsCreating(false);
    setNewForm(EMPTY_FORM);
    toast.success(`Created: ${comp.name}`);
  }, [newForm, addComponent]);

  const handleStartCreate = useCallback(() => {
    if (isDirty) {
      setPendingNav({ type: "create" });
      return;
    }
    setIsCreating(true);
    setSelectedId(null);
    setIsDirty(false);
    setNewForm(EMPTY_FORM);
  }, [isDirty]);

  /** Called when user confirms "Discard changes" in the dialog */
  const handleDiscardAndNav = useCallback(() => {
    setIsDirty(false);
    if (!pendingNav) return;
    if (pendingNav.type === "select") {
      const comp = components.find((c) => c.id === pendingNav.id);
      if (comp) {
        setSelectedId(comp.id);
        setEditedCode(comp.code);
        setIsCreating(false);
      }
    } else if (pendingNav.type === "create") {
      setIsCreating(true);
      setSelectedId(null);
      setNewForm(EMPTY_FORM);
    }
    setPendingNav(null);
  }, [pendingNav, components]);

  return (
    <div className="flex h-full bg-[#010409]">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-56 border-r border-[#21262d] flex flex-col shrink-0 bg-[#0d1117]">
        <div className="px-4 py-4 border-b border-[#21262d]">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-[14px] text-white">Component Library</span>
          </div>
          <p className="text-[10px] text-[#484f58]">
            Python code components for RAG nodes
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2 mb-1">
            <button
              onClick={() => setFilterType("all")}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                filterType === "all"
                  ? "bg-[#1f2937] text-white"
                  : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
              }`}
            >
              <span>All components</span>
              <span className="text-[10px] text-[#484f58]">{countByType.all ?? 0}</span>
            </button>
          </div>

          <div className="px-2 pt-2">
            <div className="text-[9px] text-[#484f58] uppercase tracking-wider px-1 mb-1">
              By Node Type
            </div>
            {NODE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() =>
                  setFilterType((prev) => (prev === type ? "all" : type))
                }
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                  filterType === type
                    ? "bg-[#1f2937] text-white"
                    : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
                }`}
              >
                <span className={nodeTypeColors[type] ?? "text-[#8b949e]"}>
                  {nodeTypeLabels[type]}
                </span>
                <span className="text-[10px] text-[#484f58]">
                  {countByType[type] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="px-2 pt-3">
            <div className="text-[9px] text-[#484f58] uppercase tracking-wider px-1 mb-1">
              By Provider
            </div>
            {PROVIDER_OPTIONS.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() =>
                  setFilterProvider((prev) => (prev === value ? "all" : value))
                }
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                  filterProvider === value
                    ? "bg-[#1f2937] text-white"
                    : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
                }`}
              >
                <span className={color}>{label}</span>
                <span className="text-[10px] text-[#484f58]">
                  {components.filter((c) => c.provider === value).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-[#21262d]">
          <button
            onClick={handleStartCreate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Component
          </button>
        </div>
      </div>

      {/* ── Component list ────────────────────────────────────────────────── */}
      <div className="w-80 border-r border-[#21262d] flex flex-col shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-[#21262d]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search components..."
              className="w-full pl-8 pr-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[12px] text-[#c9d1d9] placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#484f58] text-[12px]">
              No components found
            </div>
          ) : (
            filtered.map((comp) => {
              const isSelected = comp.id === selectedId;
              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelect(comp.id)}
                  className={`px-4 py-3 border-b border-[#21262d] cursor-pointer transition-colors group ${
                    isSelected
                      ? "bg-[#161b22] border-l-2 border-l-indigo-500"
                      : "hover:bg-[#161b22]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] text-white truncate">
                          {comp.name}
                        </span>
                        {comp.isDefault && (
                          <span className="text-[8px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20 shrink-0">
                            default
                          </span>
                        )}
                        {comp.isBuiltin && (
                          <span className="text-[8px] text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded-full border border-[#30363d] shrink-0">
                            built-in
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] ${
                            nodeTypeColors[comp.nodeType] ?? "text-[#8b949e]"
                          }`}
                        >
                          {nodeTypeLabels[comp.nodeType]}
                        </span>
                        {comp.provider && (
                          <>
                            <span className="text-[#21262d]">·</span>
                            <span
                              className={`text-[10px] ${
                                PROVIDER_OPTIONS.find(
                                  (p) => p.value === comp.provider
                                )?.color ?? "text-[#8b949e]"
                              }`}
                            >
                              {comp.provider}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-[#484f58] mt-0.5 line-clamp-1">
                        {comp.description}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#484f58] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Detail / Editor panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Create new component form ────────────────────────────────────── */}
        {isCreating && (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-[#21262d] flex items-center justify-between shrink-0">
              <div>
                <div className="text-[14px] text-white">New Component</div>
                <div className="text-[11px] text-[#484f58]">
                  Create a custom Python code component
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 rounded hover:bg-[#21262d] transition-colors"
              >
                <X className="w-4 h-4 text-[#8b949e]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Name *
                  </label>
                  <input
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. My Custom Embedder"
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={newForm.description}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={2}
                    placeholder="What does this component do?"
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Node type */}
                <div>
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Node Type *
                  </label>
                  <select
                    value={newForm.nodeType}
                    onChange={(e) =>
                      setNewForm((f) => ({
                        ...f,
                        nodeType: e.target.value as NodeType,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    {NODE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {nodeTypeLabels[t]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Provider
                  </label>
                  <select
                    value={newForm.provider}
                    onChange={(e) =>
                      setNewForm((f) => ({
                        ...f,
                        provider: e.target.value as ComponentProvider,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    {PROVIDER_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Tags
                  </label>
                  <input
                    value={newForm.tags}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, tags: e.target.value }))
                    }
                    placeholder="comma separated"
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Env vars */}
                <div>
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Env Variables
                  </label>
                  <input
                    value={newForm.envVars}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, envVars: e.target.value }))
                    }
                    placeholder="OPENAI_API_KEY, ..."
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Requirements */}
                <div className="col-span-2">
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    pip Requirements
                  </label>
                  <input
                    value={newForm.requirements}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, requirements: e.target.value }))
                    }
                    placeholder="openai>=1.0.0, langchain>=0.2.0, ..."
                    className="w-full px-3 py-2 rounded-md bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder-[#484f58] outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Code editor */}
                <div className="col-span-2">
                  <label className="block text-[11px] text-[#8b949e] mb-1.5 uppercase tracking-wider">
                    Python Code
                  </label>
                  <div className="rounded-lg border border-[#21262d] overflow-hidden h-72">
                    <Editor
                      height="100%"
                      language="python"
                      value={newForm.code}
                      onChange={(value) =>
                        setNewForm((f) => ({ ...f, code: value || "" }))
                      }
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        padding: { top: 8 },
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#21262d] flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewForm(EMPTY_FORM);
                }}
                className="px-4 py-2 rounded-md text-[13px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Component
              </button>
            </div>
          </div>
        )}

        {/* ── Selected component editor ─────────────────────────────────────── */}
        {!isCreating && selectedComp && (
          <div className="flex-1 flex flex-col">
            {/* Component header */}
            <div className="px-6 py-4 border-b border-[#21262d] flex items-start justify-between shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[15px] text-white">{selectedComp.name}</h2>
                  {selectedComp.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      default
                    </span>
                  )}
                  {selectedComp.isBuiltin && (
                    <span className="text-[10px] text-[#484f58] bg-[#21262d] px-2 py-0.5 rounded-full border border-[#30363d]">
                      built-in
                    </span>
                  )}
                  {selectedComp.provider && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        providerColors[selectedComp.provider] ??
                        providerColors.custom
                      }`}
                    >
                      {selectedComp.provider}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      nodeTypeColors[selectedComp.nodeType] ?? "text-[#8b949e]"
                    } bg-[#21262d]`}
                  >
                    {nodeTypeLabels[selectedComp.nodeType]}
                  </span>
                </div>
                <p className="text-[12px] text-[#8b949e] mt-1">
                  {selectedComp.description}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {selectedComp.envVars && selectedComp.envVars.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#484f58]">env:</span>
                      {selectedComp.envVars.map((v) => (
                        <code
                          key={v}
                          className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded"
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  )}
                  {selectedComp.requirements && selectedComp.requirements.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-[#484f58]" />
                      {selectedComp.requirements.map((r) => (
                        <code
                          key={r}
                          className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded"
                        >
                          {r}
                        </code>
                      ))}
                    </div>
                  )}
                  {selectedComp.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#484f58]" />
                      {selectedComp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleDuplicate(selectedComp)}
                  title="Duplicate"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Clone
                </button>
                {!selectedComp.isBuiltin && (
                  <>
                    {deleteConfirm === selectedComp.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-red-400">Sure?</span>
                        <button
                          onClick={() => handleDelete(selectedComp.id)}
                          className="px-2 py-1 rounded text-[11px] bg-red-600 hover:bg-red-500 text-white transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(selectedComp.id)}
                        title="Delete"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-[#21262d] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Built-in warning */}
            {selectedComp.isBuiltin && (
              <div className="mx-6 mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-300/80">
                  This is a <strong>built-in</strong> component. Changes made here
                  are for reference only — the code is not saved back to the library.
                  Click <strong>Clone</strong> to create an editable copy.
                </div>
              </div>
            )}

            {/* Code editor */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-2 border-b border-[#21262d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#484f58]" />
                  <span className="text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Python Code
                  </span>
                  {isDirty && (
                    <span className="text-[10px] text-amber-400">
                      · Unsaved changes
                    </span>
                  )}
                </div>
                {!selectedComp.isBuiltin && (
                  <button
                    onClick={handleSaveCode}
                    disabled={!isDirty}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[12px] transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="python"
                  value={editedCode}
                  onChange={(value) => {
                    setEditedCode(value || "");
                    setIsDirty(true);
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "off",
                    padding: { top: 8 },
                    renderLineHighlight: "gutter",
                    automaticLayout: true,
                    readOnly: selectedComp.isBuiltin,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {!isCreating && !selectedComp && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Package className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <div className="text-[15px] text-white mb-1">
                Select a component
              </div>
              <p className="text-[12px] text-[#484f58] max-w-sm">
                Browse the library on the left, or create a new Python component
                to use in your RAG system nodes.
              </p>
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Component
            </button>
          </div>
        )}
      </div>

      {/* ── Unsaved changes dialog ─────────────────────────────────────────── */}
      {pendingNav && (
        <UnsavedChangesDialog
          fromName={selectedComp?.name}
          toName={
            pendingNav.type === "select"
              ? components.find((c) => c.id === pendingNav.id)?.name
              : "New Component"
          }
          onDiscard={handleDiscardAndNav}
          onKeepEditing={() => setPendingNav(null)}
        />
      )}
    </div>
  );
}