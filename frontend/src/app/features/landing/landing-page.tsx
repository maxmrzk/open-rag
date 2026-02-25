import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Brain,
  Workflow,
  BookOpen,
  BarChart3,
  Play,
  Container,
  Monitor,
  Download,
  ArrowRight,
  Github,
  Terminal,
  Zap,
  Network,
  FlaskConical,
  Layers,
  ChevronRight,
  Star,
  Check,
  Copy,
  ExternalLink,
  Cpu,
  Globe,
  Package,
  FolderKanban,
} from "lucide-react";

// ── Electron release stubs ────────────────────────────────────────────────────
const ELECTRON_RELEASES = [
  {
    os: "macOS",
    arch: "Apple Silicon (arm64)",
    ext: ".dmg",
    icon: "🍎",
    file: "rag-builder-0.2.0-arm64.dmg",
    size: "94 MB",
  },
  {
    os: "macOS",
    arch: "Intel (x64)",
    ext: ".dmg",
    icon: "🍎",
    file: "rag-builder-0.2.0-x64.dmg",
    size: "97 MB",
  },
  {
    os: "Windows",
    arch: "x64",
    ext: ".exe",
    icon: "🪟",
    file: "rag-builder-0.2.0-setup.exe",
    size: "88 MB",
  },
  {
    os: "Linux",
    arch: "x86_64",
    ext: ".AppImage",
    icon: "🐧",
    file: "rag-builder-0.2.0.AppImage",
    size: "102 MB",
  },
];

const DOCKER_COMPOSE = `version: "3.9"
services:
  rag-builder:
    image: ghcr.io/your-org/rag-builder:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production`;

const GIT_CLONE = `git clone https://github.com/your-org/rag-builder
cd rag-builder && pnpm install && pnpm dev`;

// ── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Workflow,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    label: "Visual System Designer",
    desc: "Drag-and-drop node canvas to wire up every stage of your RAG pipeline — loaders, chunkers, embedders, retrievers, and LLMs.",
  },
  {
    icon: BookOpen,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    label: "Component Library",
    desc: "Curated Python snippets for OpenAI, Anthropic, Google, HuggingFace, LangChain, Qdrant, and more — one click to link.",
  },
  {
    icon: BarChart3,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    label: "Evaluation Suite",
    desc: "Compare retrieval runs side-by-side with RAGAS metrics, latency charts, and per-query diff views.",
  },
  {
    icon: Container,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Docker Export",
    desc: "One-click generation of production-ready docker-compose.yml and Python entry-point for any system graph you design.",
  },
  {
    icon: Network,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    label: "Graph-Enhanced RAG",
    desc: "First-class support for Neo4j and NetworkX graph stores alongside vector stores for knowledge-graph-augmented retrieval.",
  },
  {
    icon: FlaskConical,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    label: "Experiment Tracking",
    desc: "Tag and replay evaluation runs, diff chunking strategies, embedding models, and reranker configs without manual bookkeeping.",
  },
];

// ── Copy hook ─────────────────────────────────────────────────────────────────
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#010409] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d]">
        <span className="text-[10px] text-[#484f58] uppercase tracking-wider font-mono">
          {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] text-[#484f58] hover:text-[#c9d1d9] transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-[11px] text-[#c9d1d9] font-mono leading-relaxed overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const [activeDeployTab, setActiveDeployTab] = useState<"docker" | "electron">("docker");
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLaunchDemo = () => {
    setLoadingDemo(true);
    localStorage.setItem("rag_demo_mode", "true");
    setTimeout(() => navigate("/app"), 800);
  };

  const handleEnterApp = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-[#010409] text-[#c9d1d9] overflow-x-hidden">

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#21262d]/80 bg-[#010409]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[13px] text-white tracking-tight">RAG Builder</span>
              <span className="ml-1.5 text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                v0.2.0
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/your-org/rag-builder"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#8b949e] hover:text-white hover:bg-[#161b22] border border-[#21262d] hover:border-[#30363d] transition-all"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <button
              onClick={handleEnterApp}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors shadow-lg shadow-indigo-500/20"
            >
              Open App
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
          <div className="absolute top-40 left-1/3 w-[400px] h-[300px] rounded-full bg-purple-600/6 blur-[100px]" />
          <div className="absolute top-40 right-1/3 w-[350px] h-[280px] rounded-full bg-cyan-600/5 blur-[100px]" />
          {/* Dot-grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, #c9d1d9 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-[11px] text-indigo-300 mb-8">
            <Star className="w-3 h-3 text-indigo-400" />
            Open-source · Self-hosted · Privacy-first
            <Star className="w-3 h-3 text-indigo-400" />
          </div>

          {/* Headline */}
          <h1 className="text-[52px] leading-[1.15] text-white mb-6 tracking-tight max-w-3xl mx-auto">
            Build production RAG systems
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              visually, locally, without limits
            </span>
          </h1>

          <p className="text-[16px] text-[#8b949e] max-w-2xl mx-auto leading-relaxed mb-10">
            RAG Builder is an open-source visual studio for designing, configuring,
            evaluating, and deploying Retrieval-Augmented Generation pipelines.
            Your code stays on your machine — always.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={handleLaunchDemo}
              disabled={loadingDemo}
              className="group relative flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[14px] transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-70"
            >
              {loadingDemo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading demo…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Launch Demo
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
              {/* Shimmer */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={handleEnterApp}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:border-[#484f58] text-white text-[14px] transition-all"
            >
              <Layers className="w-4 h-4 text-[#8b949e]" />
              Open full app
            </button>

            <a
              href="https://github.com/your-org/rag-builder"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#21262d] bg-transparent hover:bg-[#161b22] text-[#8b949e] hover:text-white text-[14px] transition-all"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          {/* Hero image — app screenshot mockup */}
          <div className="relative mt-16 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[#21262d] overflow-hidden shadow-2xl shadow-black/60">
              {/* Fake window chrome */}
              <div className="h-10 bg-[#161b22] border-b border-[#21262d] flex items-center px-4 gap-2 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                <span className="ml-4 text-[11px] text-[#484f58] font-mono">
                  RAG Builder — System Designer
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1664854953181-b12e6dda8b7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrbm93bGVkZ2UlMjBncmFwaCUyMGRhdGElMjB2aXN1YWxpemF0aW9uJTIwbm9kZXN8ZW58MXx8fHwxNzcxOTcwODMwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="RAG Builder system designer"
                className="w-full h-72 object-cover object-top opacity-80"
              />
              {/* Gradient fade-out at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#010409] to-transparent pointer-events-none rounded-b-2xl" />
            </div>
            {/* Glow underneath */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-16 bg-indigo-600/20 blur-2xl rounded-full" />
          </div>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#21262d]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[30px] text-white mb-3 tracking-tight">
              Everything you need to build RAG systems
            </h2>
            <p className="text-[14px] text-[#8b949e] max-w-xl mx-auto">
              From raw documents to evaluated, containerised pipelines — all in one tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group rounded-xl border border-[#21262d] bg-[#0d1117] hover:bg-[#161b22] hover:border-[#30363d] p-5 transition-all"
                >
                  <div
                    className={`w-9 h-9 rounded-lg border ${f.bg} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${f.color}`} />
                  </div>
                  <div className="text-[14px] text-white mb-1.5">{f.label}</div>
                  <p className="text-[12px] text-[#8b949e] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Deployment section ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#21262d]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[30px] text-white mb-3 tracking-tight">
              Run it your way
            </h2>
            <p className="text-[14px] text-[#8b949e] max-w-lg mx-auto">
              Host the web app on your own infrastructure, or grab the native
              desktop wrapper — no internet connection required after install.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl border border-[#21262d] bg-[#0d1117] p-1 gap-1">
              <button
                onClick={() => setActiveDeployTab("docker")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] transition-all ${
                  activeDeployTab === "docker"
                    ? "bg-[#1f2937] text-white shadow"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4" />
                Self-host (Web)
              </button>
              <button
                onClick={() => setActiveDeployTab("electron")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] transition-all ${
                  activeDeployTab === "electron"
                    ? "bg-[#1f2937] text-white shadow"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Monitor className="w-4 h-4" />
                Desktop App (Electron)
              </button>
            </div>
          </div>

          {/* ── Self-host panel ── */}
          {activeDeployTab === "docker" && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Docker */}
              <div className="rounded-2xl border border-[#21262d] bg-[#0d1117] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Container className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white">Docker Compose</div>
                    <div className="text-[11px] text-[#484f58]">
                      Recommended for production
                    </div>
                  </div>
                </div>
                <CodeBlock code={DOCKER_COMPOSE} label="docker-compose.yml" />
                <div className="mt-4 space-y-2">
                  {[
                    "Persistent storage via bind mount",
                    "Automatic restart on failure",
                    "Configurable via environment variables",
                    "Works behind any reverse proxy (nginx/caddy)",
                  ].map((line) => (
                    <div key={line} className="flex items-center gap-2 text-[12px] text-[#8b949e]">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {/* Git clone */}
              <div className="rounded-2xl border border-[#21262d] bg-[#0d1117] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white">From Source</div>
                    <div className="text-[11px] text-[#484f58]">
                      Node 20+ · pnpm · Python 3.11+
                    </div>
                  </div>
                </div>
                <CodeBlock code={GIT_CLONE} label="bash" />

                <div className="mt-5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-2 text-[11px] text-amber-300/80 leading-relaxed">
                    <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    Python execution is fully local. The UI communicates with a
                    FastAPI sidecar — no code, keys, or data leave your machine.
                  </div>
                </div>

                <a
                  href="https://github.com/your-org/rag-builder/blob/main/DEPLOYMENT.md"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Full deployment docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ── Desktop/Electron panel ── */}
          {activeDeployTab === "electron" && (
            <div className="rounded-2xl border border-[#21262d] bg-[#0d1117] p-6">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Monitor className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-[16px] text-white mb-1">
                    RAG Builder Desktop
                  </div>
                  <p className="text-[12px] text-[#8b949e] max-w-xl leading-relaxed">
                    The Electron wrapper bundles the React UI, a Python 3.11 runtime,
                    and a FastAPI sidecar into a single installer. No Docker, no Node,
                    no prior setup needed — just download and run.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {ELECTRON_RELEASES.map((rel) => (
                  <button
                    key={rel.file}
                    onClick={() =>
                      alert(
                        `Download stub: ${rel.file}\n\nConnect your GitHub Releases to serve real binaries.`
                      )
                    }
                    className="group flex flex-col items-start p-4 rounded-xl border border-[#21262d] bg-[#161b22] hover:bg-[#1f2937] hover:border-indigo-500/30 transition-all text-left"
                  >
                    <div className="text-[22px] mb-2">{rel.icon}</div>
                    <div className="text-[13px] text-white">{rel.os}</div>
                    <div className="text-[10px] text-[#8b949e] mb-3">{rel.arch}</div>
                    <div className="flex items-center gap-1.5 mt-auto">
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300">
                        {rel.ext}
                      </span>
                      <span className="text-[10px] text-[#484f58] ml-auto">
                        {rel.size}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Package,
                    color: "text-emerald-400",
                    title: "Bundled Python runtime",
                    desc: "No system Python required — ships its own 3.11 environment with pip packages pre-installed.",
                  },
                  {
                    icon: Zap,
                    color: "text-amber-400",
                    title: "Native OS integration",
                    desc: "System tray icon, auto-start on login, and deep-link support for sharing system configs.",
                  },
                  {
                    icon: Cpu,
                    color: "text-purple-400",
                    title: "Offline-capable",
                    desc: "Fully functional without internet after installation. Local models run via Ollama or llama.cpp.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-4 rounded-xl border border-[#21262d] bg-[#161b22]"
                    >
                      <Icon className={`w-4 h-4 ${item.color} mb-2`} />
                      <div className="text-[12px] text-white mb-1">{item.title}</div>
                      <p className="text-[11px] text-[#484f58] leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Demo CTA banner ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#21262d]/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-[#0d1117] p-10 text-center overflow-hidden">
            {/* Background orbs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-[11px] text-indigo-300 mb-5">
                <Play className="w-3 h-3" />
                Live demo — no sign-up required
              </div>

              <h3 className="text-[26px] text-white mb-3 tracking-tight">
                Try the demo instance
              </h3>
              <p className="text-[13px] text-[#8b949e] max-w-lg mx-auto mb-8 leading-relaxed">
                Explore a pre-loaded workspace with sample projects, a Customer Support
                RAG pipeline, evaluation runs, and Docker export configs — all backed
                by mock data, nothing persisted.
              </p>

              {/* Demo feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {[
                  { icon: FolderKanban, label: "4 sample projects" },
                  { icon: Workflow, label: "System designer walkthrough" },
                  { icon: BarChart3, label: "Evaluation run comparison" },
                  { icon: Container, label: "Docker config preview" },
                  { icon: BookOpen, label: "Component library" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#21262d] text-[11px] text-[#c9d1d9]"
                  >
                    <Icon className="w-3 h-3 text-indigo-400" />
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={handleLaunchDemo}
                  disabled={loadingDemo}
                  className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[14px] transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-70"
                >
                  {loadingDemo ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Launch Demo
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
                <button
                  onClick={handleEnterApp}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-white text-[14px] transition-all"
                >
                  <Layers className="w-4 h-4 text-[#8b949e]" />
                  Open blank app
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#21262d] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span className="text-[12px] text-[#484f58]">
              RAG Builder · v0.2.0 · Dev Preview
            </span>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-[#484f58]">
            <a
              href="https://github.com/your-org/rag-builder"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#c9d1d9] transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <a
              href="https://github.com/your-org/rag-builder/blob/main/DEPLOYMENT.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#c9d1d9] transition-colors"
            >
              Docs
            </a>
            <span className="text-[#21262d]">·</span>
            <span>MIT License</span>
            <span className="text-[#21262d]">·</span>
            <span>Code never leaves your machine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}