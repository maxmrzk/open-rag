import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Workflow,
  Play,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useProject } from "../../hooks/useProjects";
import { useSystems } from "../../hooks/useSystems";
import { useProjectRuns } from "../../hooks/useRuns";

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    label: "Completed",
  },
  running: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Running" },
  failed: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: systems, isLoading: loadingSystems } = useSystems(projectId);
  const { data: runs, isLoading: loadingRuns } = useProjectRuns(projectId, {
    refetchInterval: 5000,
  });

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#8b949e] text-[13px]">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#8b949e] text-[13px]">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate("/app")}
          className="mt-0.5 p-1.5 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] text-white tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-[13px] text-[#8b949e] mt-1">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
              <Calendar className="w-3 h-3" />
              Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
              <Workflow className="w-3 h-3 text-cyan-400" />
              {project.systemCount} systems
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
              <Play className="w-3 h-3 text-green-400" />
              {project.runCount} runs
            </span>
          </div>
        </div>
      </div>

      {/* ── Systems ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Systems
          </h2>
          <Link
            to={`/app/designer?projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New System
          </Link>
        </div>

        {loadingSystems ? (
          <div className="text-[#8b949e] text-[12px] py-6 text-center">Loading systems…</div>
        ) : !systems?.length ? (
          <div className="bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl p-8 text-center">
            <Workflow className="w-8 h-8 text-[#21262d] mx-auto mb-2" />
            <p className="text-[13px] text-[#484f58]">No systems yet.</p>
            <p className="text-[12px] text-[#484f58] mt-1">
              Open the System Designer and save a system to this project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systems.map((sys) => (
              <div
                key={sys.id}
                className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 hover:border-[#30363d] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#161b22] flex items-center justify-center border border-[#21262d] shrink-0">
                      <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] text-white truncate">{sys.name}</div>
                      <div className="text-[10px] text-[#484f58] flex items-center gap-2 mt-0.5">
                        <span>v{sys.version}</span>
                        <span>·</span>
                        <span>{sys.nodes.length} nodes</span>
                        <span>·</span>
                        <span>{new Date(sys.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/app/designer?systemId=${sys.id}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-[#21262d] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Runs ── */}
      <section>
        <h2 className="text-[15px] text-white flex items-center gap-2 mb-4">
          <Play className="w-4 h-4 text-green-400" />
          Runs
        </h2>

        {loadingRuns ? (
          <div className="text-[#8b949e] text-[12px] py-6 text-center">Loading runs…</div>
        ) : !runs?.length ? (
          <div className="bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl p-8 text-center">
            <Play className="w-8 h-8 text-[#21262d] mx-auto mb-2" />
            <p className="text-[13px] text-[#484f58]">No runs yet.</p>
            <p className="text-[12px] text-[#484f58] mt-1">
              Open a system in the Designer and click Run to start an evaluation.
            </p>
          </div>
        ) : (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#21262d]">
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    System
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Prompt / Input
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Precision
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Recall
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    MRR
                  </th>
                  <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const status = statusConfig[run.status] ?? statusConfig.running;
                  const StatusIcon = status.icon;
                  return (
                    <tr
                      key={run.id}
                      className="border-b border-[#21262d] last:border-0 hover:bg-[#161b22] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/app/designer?systemId=${run.systemId}`}
                          className="text-[12px] text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {run.systemName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${status.bg} ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {run.promptInput ? (
                          <span
                            className="text-[11px] text-[#8b949e] truncate block"
                            title={run.promptInput}
                          >
                            {run.promptInput.slice(0, 60)}
                            {run.promptInput.length > 60 ? "…" : ""}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#484f58]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                        {run.status === "completed" ? run.metrics.precision.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                        {run.status === "completed" ? run.metrics.recall.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                        {run.status === "completed" ? run.metrics.mrr.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#8b949e] whitespace-nowrap">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
