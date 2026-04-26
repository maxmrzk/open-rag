import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsQueryKeys, useDefaults, useUpdateDefaults } from "../../hooks/useSettings";
import type { DefaultsOutput } from "../../api/schemas/settings.schema";

const DEFAULT_FIELDS: Array<{ key: keyof DefaultsOutput; label: string }> = [
  { key: "chunkSize", label: "Chunk Size" },
  { key: "chunkOverlap", label: "Chunk Overlap" },
  { key: "embeddingModel", label: "Embedding Model" },
  { key: "llmModel", label: "LLM Model" },
  { key: "temperature", label: "Temperature" },
  { key: "topK", label: "Top K Retrieval" },
];

export function DefaultsForm() {
  const queryClient = useQueryClient();
  const { data: defaults, isLoading, isError, refetch } = useDefaults();
  const updateDefaults = useUpdateDefaults();

  const [formState, setFormState] = useState<DefaultsOutput | null>(null);

  useEffect(() => {
    if (defaults) {
      setFormState(defaults);
    }
  }, [defaults]);

  const isDirty = useMemo(() => {
    if (!defaults || !formState) return false;
    return JSON.stringify(defaults) !== JSON.stringify(formState);
  }, [defaults, formState]);

  const handleChange = (key: keyof DefaultsOutput, value: string) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  };

  const handleSave = async () => {
    if (!formState) return;
    try {
      await updateDefaults.mutateAsync(formState);
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.defaults });
      toast.success("Defaults saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save defaults");
    }
  };

  const handleReset = () => {
    if (!defaults) return;
    setFormState(defaults);
  };

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <h3 className="text-[14px] text-white mb-4">Default Configurations</h3>

      {isLoading && <div className="text-[12px] text-[#8b949e]">Loading defaults...</div>}

      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="text-[12px] text-red-300">Failed to load default configurations.</div>
          <button
            onClick={() => refetch()}
            className="mt-2 px-2.5 py-1 rounded text-[11px] text-red-300 hover:bg-red-400/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && formState && (
        <div className="space-y-4">
          {DEFAULT_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between py-2 border-b border-[#161b22]"
            >
              <span className="text-[12px] text-[#8b949e]">{field.label}</span>
              <input
                value={formState[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-48 px-2 py-1 rounded bg-[#161b22] border border-[#21262d] text-[12px] text-white font-mono text-right focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || updateDefaults.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateDefaults.isPending ? "Saving..." : "Save Defaults"}
            </button>
            <button
              onClick={handleReset}
              disabled={!isDirty || updateDefaults.isPending}
              className="px-4 py-2 rounded-lg text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
