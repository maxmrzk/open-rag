import { useRuns } from "../../hooks/useRuns";
import { useAllSystems } from "../../hooks/useSystems";
import { CheckCircle2, Clock, AlertCircle, Play, ChevronRight, Layers } from "lucide-react";
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";

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

export function RunsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemIdFromQuery = searchParams.get("systemId") ?? undefined;

  const { data: allSystems } = useAllSystems();
  const [selectedSystemId, setSelectedSystemId] = useState<string>(systemIdFromQuery ?? "");

  const effectiveSystemId = selectedSystemId || undefined;

  // Poll every 3 s while there is a selected system
  const { data: runs } = useRuns(effectiveSystemId, { refetchInterval: 3000 });
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const handleSystemChange = (id: string) => {
    setSelectedSystemId(id);
    if (id) {
      navigate(`/app/runs?systemId=${id}`, { replace: true });
    } else {
      navigate("/app/runs", { replace: true });
    }
  };

  // Group systems by project for the dropdown
  const systemsByProject = allSystems?.reduce<
    Record<string, { projectName: string; systems: typeof allSystems }>
  >((acc, sys) => {
    if (!acc[sys.projectId]) acc[sys.projectId] = { projectName: sys.projectName, systems: [] };
    acc[sys.projectId].systems.push(sys);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] text-white tracking-tight">Runs</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            View evaluation runs and their configuration snapshots.
          </p>
        </div>

        {/* System Selector */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <select
            value={selectedSystemId}
            onChange={(e) => handleSystemChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#21262d] text-[12px] text-white focus:outline-none focus:border-indigo-500 min-w-[240px]"
          >
            <option value="">— Select a system —</option>
            {Object.values(systemsByProject ?? {}).map(({ projectName, systems }) => (
              <optgroup key={projectName} label={projectName}>
                {systems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name} (v{sys.version})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* No system selected placeholder */}
      {!effectiveSystemId && (
        <div className="flex flex-col items-center justify-center py-20 text-[#484f58]">
          <Play className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-[13px]">No system selected.</p>
          <p className="text-[12px] mt-1">
            Pick a system above or open one in the Designer and click Run.
          </p>
        </div>
      )}

      {/* Run Cards */}
      {effectiveSystemId && (
        <div className="space-y-3">
          {!runs?.length && (
            <div className="flex flex-col items-center justify-center py-16 text-[#484f58]">
              <Play className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-[12px]">No runs yet for this system.</p>
              <p className="text-[11px] mt-1">
                Open it in the Designer and click Run to start an evaluation.
              </p>
            </div>
          )}
          {(runs || []).map((run) => {
            const status = statusConfig[run.status] ?? statusConfig.running;
            const StatusIcon = status.icon;
            const isExpanded = expandedRunId === run.id;

            return (
              <div
                key={run.id}
                className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden"
              >
                {/* Run Header */}
                <button
                  onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#161b22] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-lg ${status.bg} flex items-center justify-center`}
                    >
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="text-[13px] text-white">{run.systemName}</div>
                      <div className="text-[11px] text-[#484f58] font-mono">{run.id}</div>
                      {run.promptInput && (
                        <div className="text-[10px] text-[#8b949e] mt-0.5 max-w-[320px] truncate">
                          Input: {run.promptInput}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {run.status === "completed" && (
                      <div className="flex items-center gap-4">
                        <MetricBadge label="Prec" value={run.metrics.precision} />
                        <MetricBadge label="Recall" value={run.metrics.recall} />
                        <MetricBadge label="MRR" value={run.metrics.mrr} />
                        <MetricBadge
                          label="Latency"
                          value={run.metrics.latencyMs}
                          suffix="ms"
                          isRaw
                        />
                      </div>
                    )}
                    <div className="text-[11px] text-[#8b949e] whitespace-nowrap">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-[#484f58] transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-[#21262d]">
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      {/* Metrics */}
                      <div>
                        <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">
                          Full Metrics
                        </div>
                        <div className="space-y-2">
                          {Object.entries(run.metrics).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between py-1.5 border-b border-[#161b22]"
                            >
                              <span className="text-[12px] text-[#8b949e]">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (s) => s.toUpperCase())}
                              </span>
                              <span className="text-[12px] text-white font-mono">
                                {typeof value === "number"
                                  ? key === "costUsd"
                                    ? `$${value.toFixed(3)}`
                                    : key === "latencyMs"
                                      ? `${value}ms`
                                      : key === "tokenUsage"
                                        ? value.toLocaleString()
                                        : value.toFixed(3)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Config Snapshot + prompt */}
                      <div className="space-y-4">
                        {run.promptInput && (
                          <div>
                            <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-2">
                              Document / Prompt Input
                            </div>
                            <pre className="bg-[#161b22] rounded-lg p-3 text-[11px] text-[#c9d1d9] font-mono overflow-auto max-h-[120px] whitespace-pre-wrap">
                              {run.promptInput}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-2">
                            Configuration Snapshot
                          </div>
                          <pre className="bg-[#161b22] rounded-lg p-3 text-[11px] text-[#c9d1d9] font-mono overflow-auto max-h-[200px]">
                            {JSON.stringify(run.configSnapshot, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricBadge({
  label,
  value,
  suffix,
  isRaw,
}: {
  label: string;
  value: number;
  suffix?: string;
  isRaw?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[12px] text-white font-mono">
        {isRaw ? value : value.toFixed(2)}
        {suffix && <span className="text-[10px] text-[#484f58]">{suffix}</span>}
      </div>
      <div className="text-[9px] text-[#484f58] uppercase">{label}</div>
    </div>
  );
}
