import { useRuns } from "../../hooks/useRuns";
import { CheckCircle2, Clock, AlertCircle, Play, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { EvaluationRun } from "../../types";

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
  const systemId = searchParams.get("systemId") ?? undefined;

  // Poll every 3 seconds so running jobs update their status automatically.
  // Polling is active whenever there is a systemId; React Query de-dupes the requests.
  const { data: runs } = useRuns(systemId, { refetchInterval: 3000 });
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] text-white tracking-tight">Runs</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            {systemId
              ? "View evaluation runs and their configuration snapshots."
              : 'Open a system in the Designer and click "Run System" to start an evaluation run.'}
          </p>
        </div>
      </div>

      {/* No systemId placeholder */}
      {!systemId && (
        <div className="flex flex-col items-center justify-center py-20 text-[#484f58]">
          <Play className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-[13px]">No system selected.</p>
          <p className="text-[12px] mt-1">
            Navigate to a system via the Designer to view its runs.
          </p>
        </div>
      )}

      {/* Run Cards */}
      <div className="space-y-3">
        {(runs || []).map((run) => {
          const status = statusConfig[run.status];
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
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
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

                    {/* Config Snapshot */}
                    <div>
                      <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">
                        Configuration Snapshot
                      </div>
                      <pre className="bg-[#161b22] rounded-lg p-3 text-[11px] text-[#c9d1d9] font-mono overflow-auto max-h-[200px]">
                        {JSON.stringify(run.configSnapshot, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
