import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects, useCreateProject } from "../../hooks/useProjects";
import { Plus, FolderKanban, Workflow, Play, Calendar, MoreHorizontal } from "lucide-react";

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#8b949e] text-[13px]">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] text-white tracking-tight">Projects</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Manage your RAG system projects and configurations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5 hover:border-[#30363d] transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#161b22] flex items-center justify-center border border-[#21262d]">
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[14px] text-white">{project.name}</div>
                  <div className="text-[11px] text-[#8b949e] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button className="p-1 rounded hover:bg-[#21262d] opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4 text-[#8b949e]" />
              </button>
            </div>

            {project.description && (
              <p className="text-[12px] text-[#8b949e] mb-4 line-clamp-2">{project.description}</p>
            )}

            <div className="flex items-center gap-4 pt-3 border-t border-[#21262d]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                <span>{project.systemCount} systems</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
                <Play className="w-3.5 h-3.5 text-green-400" />
                <span>{project.runCount} runs</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const handleCreate = async () => {
    await createProject.mutateAsync(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          onCreated();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-md p-6">
        <h2 className="text-[16px] text-white mb-4">Create New Project</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support RAG"
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#8b949e] mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-white placeholder:text-[#484f58] focus:outline-none focus:border-indigo-500 resize-none"
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
            disabled={!name.trim() || createProject.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createProject.isPending ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
