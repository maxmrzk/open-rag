import { NavLink, useNavigate } from "react-router";
import {
  FolderKanban,
  Workflow,
  BarChart3,
  Play,
  Settings,
  Brain,
  BookOpen,
  Home,
} from "lucide-react";

const primaryNav = [
  { path: "/app", label: "Projects", icon: FolderKanban, end: true },
  { path: "/app/designer", label: "System Designer", icon: Workflow, end: false },
  { path: "/app/library", label: "Component Library", icon: BookOpen, end: false },
];

const secondaryNav = [
  { path: "/app/evaluations", label: "Evaluations", icon: BarChart3 },
  { path: "/app/runs", label: "Runs", icon: Play },
  { path: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-60 h-full bg-[#0d1117] border-r border-[#21262d] flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-[#21262d] flex items-center gap-2.5">
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center hover:opacity-80 transition-opacity shadow-lg shadow-indigo-500/20 shrink-0"
          title="Back to landing"
        >
          <Brain className="w-4 h-4 text-white" />
        </button>
        <div className="min-w-0">
          <div className="text-[13px] text-white tracking-tight">RAG Builder</div>
          <div className="text-[10px] text-[#8b949e] tracking-wide uppercase">
            System Studio
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {/* Primary */}
        {primaryNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-[#1f2937] text-white"
                  : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
            {item.path === "/app/library" && (
              <span className="ml-auto text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                new
              </span>
            )}
          </NavLink>
        ))}

        {/* Separator */}
        <div className="mx-3 my-2 border-t border-[#21262d]" />

        {/* Secondary */}
        {secondaryNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-[#1f2937] text-white"
                  : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Back to landing */}
        <div className="mx-3 my-2 border-t border-[#21262d]" />
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#484f58] hover:text-[#8b949e] hover:bg-[#161b22] transition-colors w-full text-left"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Landing Page</span>
        </button>
      </nav>

      {/* Deployment info footer */}
      <div className="px-4 py-3 border-t border-[#21262d] space-y-1.5">
        <div className="text-[10px] text-[#484f58] uppercase tracking-wider">
          v0.2.0 · Dev Preview
        </div>
        <div className="text-[10px] text-[#484f58]">
          Python runs{" "}
          <span className="text-amber-400">locally / self-hosted</span>
          <br />
          Code is never sent to any server
        </div>
      </div>
    </aside>
  );
}
