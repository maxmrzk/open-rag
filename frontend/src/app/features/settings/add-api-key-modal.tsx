import { useState } from "react";
import { toast } from "sonner";
import { useCreateApiKey } from "../../hooks/useSettings";

const API_KEY_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function AddApiKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const createApiKey = useCreateApiKey();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const nameTrimmed = name.trim();
  const valueTrimmed = value.trim();

  const nameError =
    nameTrimmed.length > 0 && !API_KEY_NAME_PATTERN.test(nameTrimmed)
      ? "Use uppercase env-var format (e.g. OPENAI_API_KEY)."
      : null;

  const isFormValid = !!nameTrimmed && !!valueTrimmed && !nameError;

  const handleCreate = async () => {
    if (!isFormValid) return;

    try {
      await createApiKey.mutateAsync({ name: nameTrimmed, value: valueTrimmed });
      toast.success("API key stored");
      setValue("");
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to store API key");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-md p-6">
        <h2 className="text-[16px] text-white mb-4">Add API Key</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">Key Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., OPENAI_API_KEY"
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500"
            />
            {nameError && <div className="text-[11px] text-red-300 mt-1">{nameError}</div>}
          </div>
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">Secret Value</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste secret value"
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isFormValid || createApiKey.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createApiKey.isPending ? "Saving..." : "Save API Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
