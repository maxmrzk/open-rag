import { mockDockerCompose, mockDockerfile } from "./docker";
import { mockProjects } from "./projects";
import { mockRuns } from "./runs";
import { mockSystems } from "./systems";

type ApiEnvelope<T> = {
  success: true;
  data: T;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  systemCount: number;
  runCount: number;
};

type SystemNode = {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

type SystemEdge = {
  id: string;
  source: string;
  target: string;
};

type System = {
  id: string;
  projectId: string;
  name: string;
  version: number;
  nodes: SystemNode[];
  edges: SystemEdge[];
  createdAt: string;
  updatedAt: string;
};

type Run = {
  id: string;
  systemId: string;
  systemName: string;
  metrics: {
    precision: number;
    recall: number;
    mrr: number;
    latencyMs: number;
    tokenUsage: number;
    costUsd: number;
    hallucinationScore: number;
  };
  configSnapshot: Record<string, unknown>;
  status: "completed" | "running" | "failed";
  createdAt: string;
  promptInput?: string | null;
};

type DemoState = {
  projects: Project[];
  systems: System[];
  runs: Run[];
  apiKeys: ApiKey[];
  defaults: Defaults;
};

type ApiKey = {
  id: string;
  name: string;
  value: string;
  lastUsed: string | null;
};

type Defaults = {
  chunkSize: string;
  chunkOverlap: string;
  embeddingModel: string;
  llmModel: string;
  temperature: string;
  topK: string;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data };
}

function notFound(): never {
  throw new Error("API Error: 404 Not Found");
}

let state: DemoState = {
  projects: clone(mockProjects),
  systems: clone(mockSystems),
  runs: clone(mockRuns),
  apiKeys: [
    {
      id: crypto.randomUUID(),
      name: "OPENAI_API_KEY",
      value: "sk-...Xk9f",
      lastUsed: "2026-02-24T08:00:00Z",
    },
    {
      id: crypto.randomUUID(),
      name: "COHERE_API_KEY",
      value: "co-...M2hf",
      lastUsed: "2026-02-23T14:30:00Z",
    },
  ],
  defaults: {
    chunkSize: "512",
    chunkOverlap: "64",
    embeddingModel: "text-embedding-3-large",
    llmModel: "gpt-4o",
    temperature: "0.1",
    topK: "10",
  },
};

function recalcProjectCounts() {
  const systemsByProject: Record<string, number> = {};
  const runsByProject: Record<string, number> = {};

  for (const system of state.systems) {
    systemsByProject[system.projectId] = (systemsByProject[system.projectId] ?? 0) + 1;
  }

  for (const run of state.runs) {
    const system = state.systems.find((s) => s.id === run.systemId);
    if (!system) continue;
    runsByProject[system.projectId] = (runsByProject[system.projectId] ?? 0) + 1;
  }

  state.projects = state.projects.map((project) => ({
    ...project,
    systemCount: systemsByProject[project.id] ?? 0,
    runCount: runsByProject[project.id] ?? 0,
  }));
}

function enrichRun(run: Run) {
  const system = state.systems.find((s) => s.id === run.systemId);
  const project = state.projects.find((p) => p.id === system?.projectId);
  return {
    ...run,
    projectId: project?.id ?? null,
    projectName: project?.name ?? "",
  };
}

export async function handleDemoApiRequest<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  recalcProjectCounts();

  const [path, rawQuery] = url.split("?");
  const query = new URLSearchParams(rawQuery ?? "");

  if (method === "GET" && path === "/projects") {
    return ok(clone(state.projects)) as T;
  }

  const projectDetailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (method === "GET" && projectDetailMatch) {
    const project = state.projects.find((p) => p.id === projectDetailMatch[1]);
    if (!project) notFound();
    return ok(clone(project)) as T;
  }

  if (method === "POST" && path === "/projects") {
    const payload = (body ?? {}) as { name?: string; description?: string };
    const project: Project = {
      id: crypto.randomUUID(),
      name: (payload.name ?? "Untitled Project").trim() || "Untitled Project",
      description: payload.description,
      createdAt: nowIso(),
      systemCount: 0,
      runCount: 0,
    };
    state.projects.unshift(project);
    return ok(clone(project)) as T;
  }

  const projectSystemsMatch = path.match(/^\/projects\/([^/]+)\/systems$/);
  if (method === "GET" && projectSystemsMatch) {
    const projectId = projectSystemsMatch[1];
    const systems = state.systems.filter((s) => s.projectId === projectId);
    return ok(clone(systems)) as T;
  }

  if (method === "POST" && projectSystemsMatch) {
    const projectId = projectSystemsMatch[1];
    const payload = (body ?? {}) as {
      name?: string;
      nodes?: SystemNode[];
      edges?: SystemEdge[];
    };

    const system: System = {
      id: crypto.randomUUID(),
      projectId,
      name: (payload.name ?? "RAG System").trim() || "RAG System",
      version: 1,
      nodes: payload.nodes ?? [],
      edges: payload.edges ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    state.systems.unshift(system);
    recalcProjectCounts();
    return ok(clone(system)) as T;
  }

  if (method === "GET" && path === "/systems") {
    const summaries = state.systems.map((system) => {
      const project = state.projects.find((p) => p.id === system.projectId);
      return {
        id: system.id,
        projectId: system.projectId,
        projectName: project?.name ?? "",
        name: system.name,
        version: system.version,
        updatedAt: system.updatedAt,
      };
    });
    return ok(clone(summaries)) as T;
  }

  const systemDetailMatch = path.match(/^\/systems\/([^/]+)$/);
  if (method === "GET" && systemDetailMatch) {
    const system = state.systems.find((s) => s.id === systemDetailMatch[1]);
    if (!system) notFound();
    return ok(clone(system)) as T;
  }

  if (method === "PUT" && systemDetailMatch) {
    const systemId = systemDetailMatch[1];
    const payload = (body ?? {}) as { name?: string; nodes?: SystemNode[]; edges?: SystemEdge[] };
    const index = state.systems.findIndex((s) => s.id === systemId);
    if (index < 0) notFound();

    const current = state.systems[index];
    const updated: System = {
      ...current,
      name: payload.name ?? current.name,
      nodes: payload.nodes ?? current.nodes,
      edges: payload.edges ?? current.edges,
      version: current.version + 1,
      updatedAt: nowIso(),
    };
    state.systems[index] = updated;
    return ok(clone(updated)) as T;
  }

  const systemRunsMatch = path.match(/^\/systems\/([^/]+)\/runs$/);
  if (method === "GET" && systemRunsMatch) {
    const systemId = systemRunsMatch[1];
    const runs = state.runs.filter((r) => r.systemId === systemId).map(enrichRun);
    return ok(clone(runs)) as T;
  }

  if (method === "POST" && systemRunsMatch) {
    const systemId = systemRunsMatch[1];
    const payload = (body ?? {}) as { promptInput?: string | null };
    const system = state.systems.find((s) => s.id === systemId);
    if (!system) notFound();

    const run: Run = {
      id: crypto.randomUUID(),
      systemId,
      systemName: system.name,
      promptInput: payload.promptInput ?? null,
      metrics: {
        precision: 0,
        recall: 0,
        mrr: 0,
        latencyMs: 0,
        tokenUsage: 0,
        costUsd: 0,
        hallucinationScore: 0,
      },
      configSnapshot: { source: "demo" },
      status: "running",
      createdAt: nowIso(),
    };

    state.runs.unshift(run);
    recalcProjectCounts();
    return ok(clone(enrichRun(run))) as T;
  }

  const projectRunsMatch = path.match(/^\/projects\/([^/]+)\/runs$/);
  if (method === "GET" && projectRunsMatch) {
    const projectId = projectRunsMatch[1];
    const systemIds = new Set(
      state.systems.filter((system) => system.projectId === projectId).map((system) => system.id)
    );
    const runs = state.runs.filter((run) => systemIds.has(run.systemId)).map(enrichRun);
    return ok(clone(runs)) as T;
  }

  if (method === "GET" && path === "/runs") {
    return ok(clone(state.runs.map(enrichRun))) as T;
  }

  if (method === "GET" && path === "/settings/api-keys") {
    return ok(clone(state.apiKeys)) as T;
  }

  if (method === "POST" && path === "/settings/api-keys") {
    const payload = (body ?? {}) as { name?: string; value?: string };
    const name = (payload.name ?? "").trim();
    const value = (payload.value ?? "").trim();
    if (!name || !value) {
      throw new Error("API Error: 400 Bad Request");
    }
    const masked = value.length <= 8 ? "***" : `${value.slice(0, 3)}...${value.slice(-4)}`;
    const key: ApiKey = {
      id: crypto.randomUUID(),
      name,
      value: masked,
      lastUsed: null,
    };
    state.apiKeys.unshift(key);
    return ok(clone(key)) as T;
  }

  const settingsKeyMatch = path.match(/^\/settings\/api-keys\/([^/]+)$/);
  if (method === "DELETE" && settingsKeyMatch) {
    const keyId = settingsKeyMatch[1];
    const before = state.apiKeys.length;
    state.apiKeys = state.apiKeys.filter((k) => k.id !== keyId);
    if (before === state.apiKeys.length) notFound();
    return ok(null) as T;
  }

  if (method === "GET" && path === "/settings/defaults") {
    return ok(clone(state.defaults)) as T;
  }

  if (method === "PUT" && path === "/settings/defaults") {
    const payload = (body ?? {}) as Partial<Defaults>;
    state.defaults = {
      ...state.defaults,
      ...Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v == null ? "" : String(v)])
      ),
    };
    return ok(clone(state.defaults)) as T;
  }

  if (method === "GET" && path === "/runs/compare") {
    const baseline = query.get("baseline");
    const compared = query.getAll("compared");
    const ids = new Set([baseline, ...compared].filter(Boolean) as string[]);
    const runs = state.runs.filter((run) => ids.has(run.id)).map(enrichRun);
    return ok(clone(runs)) as T;
  }

  const dockerExportMatch = path.match(/^\/systems\/([^/]+)\/export\/docker$/);
  if (method === "GET" && dockerExportMatch) {
    return ok({ dockerfile: mockDockerfile, dockerCompose: mockDockerCompose }) as T;
  }

  throw new Error(`API Error: 404 Not Found (${method} ${path})`);
}
