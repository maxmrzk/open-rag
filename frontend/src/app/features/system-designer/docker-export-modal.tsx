import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import Editor from "@monaco-editor/react";
import { X, Copy, Download } from "lucide-react";
import { mockDockerfile, mockDockerCompose } from "../../mock/docker";
import { apiClient } from "../../api/client";
import { toast } from "sonner";

interface DockerExportModalProps {
  onClose: () => void;
}

export function DockerExportModal({ onClose }: DockerExportModalProps) {
  const [activeTab, setActiveTab] = useState<"dockerfile" | "compose">("compose");
  const [searchParams] = useSearchParams();
  const systemId = searchParams.get("systemId");

  // Fetch from real backend when a systemId is available
  const { data: exportData } = useQuery({
    queryKey: ["docker-export", systemId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { dockerfile: string; dockerCompose: string } }>(
        `/systems/${systemId}/export/docker`
      );
      // unwrap envelope
      const payload = (res as any)?.data ?? res;
      return payload as { dockerfile: string; dockerCompose: string };
    },
    enabled: !!systemId,
    staleTime: Infinity, // deterministic per system version
  });

  const dockerfile = exportData?.dockerfile ?? mockDockerfile;
  const dockerCompose = exportData?.dockerCompose ?? mockDockerCompose;

  const currentContent = activeTab === "compose" ? dockerCompose : dockerfile;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    const filename = activeTab === "compose" ? "docker-compose.yml" : "Dockerfile";
    const blob = new Blob([currentContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-3xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] text-white">Docker Export</h2>
            <div className="flex bg-[#161b22] rounded-md p-0.5">
              <button
                onClick={() => setActiveTab("compose")}
                className={`px-3 py-1 rounded text-[11px] transition-colors ${
                  activeTab === "compose"
                    ? "bg-[#21262d] text-white"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                docker-compose.yml
              </button>
              <button
                onClick={() => setActiveTab("dockerfile")}
                className={`px-3 py-1 rounded text-[11px] transition-colors ${
                  activeTab === "dockerfile"
                    ? "bg-[#21262d] text-white"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                Dockerfile
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#21262d] transition-colors"
            >
              <X className="w-4 h-4 text-[#8b949e]" />
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage={activeTab === "compose" ? "yaml" : "dockerfile"}
            value={currentContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 8 },
              renderLineHighlight: "none",
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
