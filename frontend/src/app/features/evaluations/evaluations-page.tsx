import { useState, useMemo } from "react";
import {
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  GitCompareArrows,
} from "lucide-react";
import { useRuns } from "../../hooks/useRuns";
import type { EvaluationRun } from "../../types";
import { MetricsComparisonChart } from "./metrics-chart";

const metricLabels: Record<string, string> = {
  precision: "Precision",
  recall: "Recall",
  mrr: "MRR",
  latencyMs: "Latency (ms)",
  tokenUsage: "Token Usage",
  costUsd: "Cost (USD)",
  hallucinationScore: "Halluc. Score",
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
  running: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
  failed: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
};

export function EvaluationsPage() {
  const { data: runs } = useRuns();
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const completedRuns = useMemo(() => (runs || []).filter((r) => r.status === "completed"), [runs]);

  const sortedRuns = useMemo(() => {
    const sorted = [...(runs || [])].sort((a, b) => {
      if (sortField === "createdAt") {
        return sortDir === "desc"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const aVal = (a.metrics as any)[sortField] ?? 0;
      const bVal = (b.metrics as any)[sortField] ?? 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [runs, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleRunSelection = (runId: string) => {
    setSelectedRunIds((ids) =>
      ids.includes(runId) ? ids.filter((id) => id !== runId) : [...ids, runId]
    );
  };

  const selectedRuns = useMemo(
    () => completedRuns.filter((r) => selectedRunIds.includes(r.id)),
    [completedRuns, selectedRunIds]
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] text-white tracking-tight">Evaluations</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Compare RAG system performance across different configurations.
          </p>
        </div>
        {selectedRunIds.length >= 2 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <GitCompareArrows className="w-4 h-4 text-indigo-400" />
            <span className="text-[12px] text-indigo-300">
              {selectedRunIds.length} runs selected for comparison
            </span>
          </div>
        )}
      </div>

      {/* Comparison Chart */}
      {selectedRuns.length >= 2 && (
        <div className="mb-6 bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
          <h3 className="text-[14px] text-white mb-4">Metrics Comparison</h3>
          <MetricsComparisonChart runs={selectedRuns} />
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="px-4 py-3 w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                  System
                </th>
                <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                  Status
                </th>
                {Object.entries(metricLabels).map(([key, label]) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                    onClick={() => toggleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortField === key && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                ))}
                <th
                  className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === "createdAt" && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((run) => {
                const status = statusConfig[run.status];
                const StatusIcon = status.icon;
                const isSelected = selectedRunIds.includes(run.id);

                return (
                  <tr
                    key={run.id}
                    className={`border-b border-[#21262d] last:border-0 hover:bg-[#161b22] transition-colors ${
                      isSelected ? "bg-indigo-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRunSelection(run.id)}
                        disabled={run.status !== "completed"}
                        className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#161b22] accent-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] text-white">{run.systemName}</div>
                      <div className="text-[10px] text-[#484f58] font-mono mt-0.5">
                        {run.id.slice(0, 12)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${status.bg} ${status.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {run.status}
                      </div>
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
                    <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                      {run.status === "completed" ? `${run.metrics.latencyMs}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                      {run.status === "completed" ? run.metrics.tokenUsage.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                      {run.status === "completed" ? `$${run.metrics.costUsd.toFixed(3)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#c9d1d9] font-mono">
                      {run.status === "completed" ? run.metrics.hallucinationScore.toFixed(2) : "—"}
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
      </div>
    </div>
  );
}
