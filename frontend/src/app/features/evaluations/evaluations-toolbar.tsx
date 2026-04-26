import { GitCompareArrows, Layers } from "lucide-react";
import type { SystemSummaryOutput } from "../../api/schemas/system.schema";

export function EvaluationsToolbar({
  selectedSystemId,
  systems,
  selectedRunCount,
  onSystemChange,
}: {
  selectedSystemId: string;
  systems: SystemSummaryOutput[] | undefined;
  selectedRunCount: number;
  onSystemChange: (value: string) => void;
}) {
  const systemsByProject = systems?.reduce<
    Record<string, { projectName: string; systems: SystemSummaryOutput[] }>
  >((acc, sys) => {
    if (!acc[sys.projectId]) acc[sys.projectId] = { projectName: sys.projectName, systems: [] };
    acc[sys.projectId].systems.push(sys);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
        <select
          value={selectedSystemId}
          onChange={(e) => onSystemChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#21262d] text-[12px] text-white focus:outline-none focus:border-indigo-500 min-w-[220px]"
        >
          <option value="">All Systems</option>
          {Object.values(systemsByProject ?? {}).map(({ projectName, systems: grouped }) => (
            <optgroup key={projectName} label={projectName}>
              {grouped.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name} (v{sys.version})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedRunCount >= 2 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
          <GitCompareArrows className="w-4 h-4 text-indigo-400" />
          <span className="text-[12px] text-indigo-300">{selectedRunCount} runs selected</span>
        </div>
      )}
    </div>
  );
}
