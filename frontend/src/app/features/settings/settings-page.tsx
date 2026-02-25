import { useState } from "react";
import { Key, Server, Globe, Shield } from "lucide-react";
import { toast } from "sonner";

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

const mockApiKeys = [
  { id: "1", name: "OPENAI_API_KEY", value: "sk-...Xk9f", lastUsed: "2026-02-24T08:00:00Z" },
  { id: "2", name: "COHERE_API_KEY", value: "co-...M2hf", lastUsed: "2026-02-23T14:30:00Z" },
  { id: "3", name: "PINECONE_API_KEY", value: "pc-...9dFa", lastUsed: "2026-02-22T10:15:00Z" },
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
          {activeSection === "defaults" && <DefaultsSection />}
          {activeSection === "security" && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] text-white">API Keys</h3>
        <button
          onClick={() => toast.success("Add key dialog (mock)")}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
        >
          + Add Key
        </button>
      </div>
      <div className="space-y-2">
        {mockApiKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between py-3 px-3 rounded-lg bg-[#161b22] border border-[#21262d]"
          >
            <div>
              <div className="text-[12px] text-white font-mono">{key.name}</div>
              <div className="text-[10px] text-[#484f58] mt-0.5">
                Last used: {new Date(key.lastUsed).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#484f58] font-mono">{key.value}</span>
              <button className="px-2 py-1 rounded text-[11px] text-red-400 hover:bg-red-400/10 transition-colors">
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
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
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#161b22]">
            <span className="text-[12px] text-[#8b949e]">{item.label}</span>
            <span className="text-[12px] text-white font-mono">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DefaultsSection() {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
      <h3 className="text-[14px] text-white mb-4">Default Configurations</h3>
      <div className="space-y-4">
        {[
          { label: "Chunk Size", value: "512" },
          { label: "Chunk Overlap", value: "64" },
          { label: "Embedding Model", value: "text-embedding-3-large" },
          { label: "LLM Model", value: "gpt-4o" },
          { label: "Temperature", value: "0.1" },
          { label: "Top K Retrieval", value: "10" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#161b22]">
            <span className="text-[12px] text-[#8b949e]">{item.label}</span>
            <input
              defaultValue={item.value}
              className="w-48 px-2 py-1 rounded bg-[#161b22] border border-[#21262d] text-[12px] text-white font-mono text-right focus:outline-none focus:border-indigo-500"
            />
          </div>
        ))}
        <button
          onClick={() => toast.success("Defaults saved (mock)")}
          className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
        >
          Save Defaults
        </button>
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
            <div className="text-[10px] text-[#484f58]">AES-256 encryption for stored configurations</div>
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
            <div className="text-[10px] text-[#484f58]">Multi-factor auth before Docker exports</div>
          </div>
          <div className="w-9 h-5 rounded-full bg-[#30363d] relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-[#8b949e] absolute left-0.5 top-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
