import { AlertCircle, ArrowUpDown, CheckCircle2, Clock } from "lucide-react";
import type { EvaluationRunOutput } from "../../api/schemas/run.schema";

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

export function EvaluationsTable({
  runs,
  sortField,
  onToggleSort,
  selectedRunIds,
  onToggleRunSelection,
}: {
  runs: EvaluationRunOutput[];
  sortField: string;
  onToggleSort: (field: string) => void;
  selectedRunIds: string[];
  onToggleRunSelection: (runId: string) => void;
}) {
  if (!runs.length) {
    return (
      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-10 text-center">
        <div className="text-[13px] text-[#8b949e]">No evaluation runs found.</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="px-4 py-3 w-10">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">
                System / Project
              </th>
              <th className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider">Status</th>
              {Object.entries(metricLabels).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                  onClick={() => onToggleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortField === key && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
              ))}
              <th
                className="px-4 py-3 text-[11px] text-[#8b949e] uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => onToggleSort("createdAt")}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortField === "createdAt" && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const status = statusConfig[run.status] ?? statusConfig.running;
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
                      onChange={() => onToggleRunSelection(run.id)}
                      disabled={run.status !== "completed"}
                      className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#161b22] accent-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] text-white">{run.systemName}</div>
                    <div className="text-[10px] text-[#484f58] font-mono mt-0.5">
                      {run.projectName && (
                        <span className="text-[10px] text-indigo-400/70">{run.projectName} · </span>
                      )}
                      {run.id.slice(0, 12)}…
                    </div>
                    {run.status === "failed" && run.errorMessage && (
                      <div className="text-[10px] text-red-300 mt-1 max-w-[260px] truncate">
                        {run.errorMessage}
                      </div>
                    )}
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
  );
}
