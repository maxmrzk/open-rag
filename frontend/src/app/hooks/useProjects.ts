import { useApiQuery, useApiMutation } from "./useApi";
import { ProjectListSchema, ProjectSchema } from "../api/schemas/project.schema";
import type { ProjectInput, ProjectOutput } from "../api/schemas/project.schema";

// ============================================================
// Projects Hook — Live backend integration
// ============================================================

export const useProjects = () => {
  return useApiQuery({
    queryKey: ["projects"],
    url: "/projects",
    schema: ProjectListSchema,
  });
};

export const useCreateProject = () => {
  return useApiMutation<ProjectInput, ProjectOutput>({
    url: "/projects",
    method: "POST",
    schema: ProjectSchema,
  });
};
