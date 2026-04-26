import { useState } from "react";
import { Key, Server, Globe, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { settingsQueryKeys, useApiKeys } from "../../hooks/useSettings";
import { AddApiKeyModal } from "./add-api-key-modal";
import { ApiKeyRow } from "./api-key-row";
import { DefaultsForm } from "./defaults-form";

interface SettingSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "infrastructure", label: "Infrastructure", icon: Server },
  { id: "defaults", label: "Default Configs", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("api-keys");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#8b949e] mt-1">
          Configure API keys, infrastructure, and system defaults.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-52 shrink-0 space-y-0.5">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                activeSection === section.id
                  ? "bg-[#1f2937] text-white"
                  : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === "api-keys" && <ApiKeysSection />}
          {activeSection === "infrastructure" && <InfraSection />}
          {activeSection === "defaults" && <DefaultsForm />}
          {activeSection === "security" && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const queryClient = useQueryClient();
  const { data: apiKeys, isLoading, isError, refetch } = useApiKeys();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] text-white">API Keys</h3>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
        >
          + Add Key
        </button>
      </div>

      {isLoading && <div className="text-[12px] text-[#8b949e]">Loading API keys...</div>}

      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="text-[12px] text-red-300">Failed to load API keys.</div>
          <button
            onClick={() => refetch()}
            className="mt-2 px-2.5 py-1 rounded text-[11px] text-red-300 hover:bg-red-400/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-2">
          {apiKeys?.length ? (
            apiKeys.map((key) => (
              <ApiKeyRow
                key={key.id}
                apiKey={key}
                onDeleted={() => {
                  queryClient.invalidateQueries({ queryKey: settingsQueryKeys.apiKeys });
                }}
              />
            ))
          ) : (
            <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-4 text-[12px] text-[#8b949e]">
              No API keys stored yet. Add your first key to run provider-backed evaluations.
            </div>
          )}
        </div>
      )}

      {isCreateOpen && (
        <AddApiKeyModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: settingsQueryKeys.apiKeys });
          }}
        />
      )}
    </div>
  );
}

function InfraSection() {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <h3 className="text-[14px] text-white mb-4">Infrastructure</h3>
      <div className="space-y-4">
        {[
          { label: "Default Vector DB", value: "Qdrant (localhost:6333)" },
          { label: "Default Graph DB", value: "Neo4j (localhost:7687)" },
          { label: "Docker Registry", value: "ghcr.io/your-org" },
          { label: "S3 Bucket", value: "s3://rag-artifacts" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2 border-b border-[#161b22]"
          >
            <span className="text-[12px] text-[#8b949e]">{item.label}</span>
            <span className="text-[12px] text-white font-mono">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <h3 className="text-[14px] text-white mb-4">Security</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[12px] text-white">Encrypt configs at rest</div>
            <div className="text-[10px] text-[#484f58]">
              AES-256 encryption for stored configurations
            </div>
          </div>
          <div className="w-9 h-5 rounded-full bg-indigo-600 relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-white absolute right-0.5 top-0.5" />
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[12px] text-white">Audit logging</div>
            <div className="text-[10px] text-[#484f58]">Log all system modifications</div>
          </div>
          <div className="w-9 h-5 rounded-full bg-indigo-600 relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-white absolute right-0.5 top-0.5" />
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[12px] text-white">Require MFA for exports</div>
            <div className="text-[10px] text-[#484f58]">
              Multi-factor auth before Docker exports
            </div>
          </div>
          <div className="w-9 h-5 rounded-full bg-[#30363d] relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-[#8b949e] absolute left-0.5 top-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
