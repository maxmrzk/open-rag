import { useState } from "react";
import { toast } from "sonner";
import { useDeleteApiKey } from "../../hooks/useSettings";
import type { ApiKeyOutput } from "../../api/schemas/settings.schema";

function formatLastUsed(value: string | null | undefined) {
  if (!value) return "Never used";
  return new Date(value).toLocaleDateString();
}

export function ApiKeyRow({ apiKey, onDeleted }: { apiKey: ApiKeyOutput; onDeleted: () => void }) {
  const deleteApiKey = useDeleteApiKey(apiKey.id);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleRevoke = async () => {
    try {
      await deleteApiKey.mutateAsync();
      toast.success(`Revoked ${apiKey.name}`);
      onDeleted();
      setConfirmRevoke(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke API key");
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-[#161b22] border border-[#21262d]">
      <div>
        <div className="text-[12px] text-white font-mono">{apiKey.name}</div>
        <div className="text-[10px] text-[#484f58] mt-0.5">
          Last used: {formatLastUsed(apiKey.lastUsed)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#484f58] font-mono">{apiKey.value}</span>
        {!confirmRevoke ? (
          <button
            onClick={() => setConfirmRevoke(true)}
            className="px-2 py-1 rounded text-[11px] text-red-400 hover:bg-red-400/10 transition-colors"
          >
            Revoke
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleRevoke}
              disabled={deleteApiKey.isPending}
              className="px-2 py-1 rounded text-[11px] text-red-300 hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleteApiKey.isPending ? "Revoking..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmRevoke(false)}
              disabled={deleteApiKey.isPending}
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
