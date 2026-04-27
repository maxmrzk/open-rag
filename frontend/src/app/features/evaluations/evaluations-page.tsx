import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useAllRuns, useRunComparison, useRuns } from "../../hooks/useRuns";
import { useAllSystems } from "../../hooks/useSystems";
import { MetricsComparisonChart } from "./metrics-chart";
import { EvaluationsToolbar } from "./evaluations-toolbar";
import { EvaluationsTable } from "./evaluations-table";

type SortField =
  | "createdAt"
  | "precision"
  | "recall"
  | "mrr"
  | "latencyMs"
  | "tokenUsage"
  | "costUsd"
  | "hallucinationScore";

export function EvaluationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSystemId = searchParams.get("systemId") ?? "";
  const initialSortField = (searchParams.get("sort") as SortField | null) ?? "createdAt";
  const initialSortDir = (searchParams.get("dir") as "asc" | "desc" | null) ?? "desc";
  const initialSelected = (searchParams.get("selected") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [selectedSystemId, setSelectedSystemId] = useState<string>(initialSystemId);
  const { data: allSystems } = useAllSystems();

  const {
    data: systemRuns,
    isLoading: isSystemRunsLoading,
    isError: isSystemRunsError,
  } = useRuns(selectedSystemId || undefined, { refetchInterval: 3000 });
  const {
    data: allRuns,
    isLoading: isAllRunsLoading,
    isError: isAllRunsError,
  } = useAllRuns({
    refetchInterval: 3000,
  });
  const runs = selectedSystemId ? systemRuns : allRuns;
  const isRunsLoading = selectedSystemId ? isSystemRunsLoading : isAllRunsLoading;
  const isRunsError = selectedSystemId ? isSystemRunsError : isAllRunsError;

  const [selectedRunIds, setSelectedRunIds] = useState<string[]>(initialSelected);
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedSystemId) next.set("systemId", selectedSystemId);
    else next.delete("systemId");
    next.set("sort", sortField);
    next.set("dir", sortDir);
    if (selectedRunIds.length) next.set("selected", selectedRunIds.join(","));
    else next.delete("selected");
    setSearchParams(next, { replace: true });
  }, [selectedSystemId, sortField, sortDir, selectedRunIds, searchParams, setSearchParams]);

  const completedRuns = useMemo(() => (runs || []).filter((r) => r.status === "completed"), [runs]);

  const [baselineId, comparedIds] = useMemo(() => {
    if (selectedRunIds.length < 2) return [undefined, [] as string[]];
    return [selectedRunIds[0], selectedRunIds.slice(1)];
  }, [selectedRunIds]);

  const { data: comparedRuns } = useRunComparison(baselineId, comparedIds, {
    refetchInterval: 3000,
  });

  const sortedRuns = useMemo(() => {
    const sorted = [...(runs || [])].sort((a, b) => {
      if (sortField === "createdAt") {
        return sortDir === "desc"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const aVal = a.metrics[sortField as Exclude<SortField, "createdAt">] ?? 0;
      const bVal = b.metrics[sortField as Exclude<SortField, "createdAt">] ?? 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [runs, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
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

  const selectedRuns = useMemo(() => {
    if (selectedRunIds.length < 2)
      return completedRuns.filter((r) => selectedRunIds.includes(r.id));
    if (comparedRuns?.length) return comparedRuns;
    return completedRuns.filter((r) => selectedRunIds.includes(r.id));
  }, [completedRuns, selectedRunIds, comparedRuns]);

  const handleSystemChange = (value: string) => {
    setSelectedSystemId(value);
    setSelectedRunIds([]);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] text-white tracking-tight">Evaluations</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Compare RAG system performance across different configurations.
          </p>
        </div>

        <EvaluationsToolbar
          selectedSystemId={selectedSystemId}
          systems={allSystems}
          selectedRunCount={selectedRunIds.length}
          onSystemChange={handleSystemChange}
        />
      </div>

      {isRunsLoading && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-10 text-center text-[13px] text-[#8b949e] mb-6">
          Loading evaluation runs...
        </div>
      )}

      {isRunsError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
          <div className="text-[12px] text-red-300">Failed to load evaluation runs.</div>
        </div>
      )}

      {selectedRuns.length >= 2 && (
        <div className="mb-6 bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
          <h3 className="text-[14px] text-white mb-4">Metrics Comparison</h3>
          <MetricsComparisonChart runs={selectedRuns} />
        </div>
      )}

      {!isRunsLoading && !isRunsError && (
        <EvaluationsTable
          runs={sortedRuns}
          sortField={sortField}
          onToggleSort={toggleSort}
          selectedRunIds={selectedRunIds}
          onToggleRunSelection={toggleRunSelection}
        />
      )}
    </div>
  );
}
