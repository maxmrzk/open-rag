/**
 * Tests for all Zod schemas in the API contract layer.
 * These are pure unit tests — no network or React needed.
 */
import { describe, it, expect } from "vitest";
import {
  ProjectSchema,
  ProjectListSchema,
  CreateProjectSchema,
} from "@/app/api/schemas/project.schema";
import {
  MetricsSchema,
  EvaluationRunSchema,
  EvaluationRunListSchema,
  RunStatusSchema,
} from "@/app/api/schemas/run.schema";
import {
  SystemNodeSchema,
  SystemEdgeSchema,
  SystemDefinitionSchema,
} from "@/app/api/schemas/system.schema";
import { UUIDSchema, TimestampSchema, ApiResponseSchema } from "@/app/api/schemas/common.schema";

// ─────────────────────────────────────────────────────────────────────────────
// Common schemas
// ─────────────────────────────────────────────────────────────────────────────

describe("UUIDSchema", () => {
  it("accepts a valid UUID v4", () => {
    expect(() => UUIDSchema.parse("550e8400-e29b-41d4-a716-446655440000")).not.toThrow();
  });

  it("rejects a non-UUID string", () => {
    expect(() => UUIDSchema.parse("not-a-uuid")).toThrow();
  });
});

describe("TimestampSchema", () => {
  it("accepts ISO 8601 with offset", () => {
    expect(() => TimestampSchema.parse("2024-01-15T10:30:00Z")).not.toThrow();
  });

  it("accepts ISO 8601 with timezone offset", () => {
    expect(() => TimestampSchema.parse("2024-01-15T10:30:00+02:00")).not.toThrow();
  });
});

describe("ApiResponseSchema", () => {
  it("parses a valid envelope", () => {
    const schema = ApiResponseSchema(ProjectListSchema);
    const result = schema.parse({
      data: [],
      success: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Project schemas
// ─────────────────────────────────────────────────────────────────────────────

const validProject = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "My RAG Project",
  description: "A test project",
  createdAt: "2024-01-15T10:30:00Z",
  systemCount: 2,
  runCount: 5,
};

describe("ProjectSchema", () => {
  it("parses a valid project", () => {
    const p = ProjectSchema.parse(validProject);
    expect(p.name).toBe("My RAG Project");
    expect(p.systemCount).toBe(2);
  });

  it("accepts missing description", () => {
    const p = ProjectSchema.parse({ ...validProject, description: undefined });
    expect(p.description).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(() => ProjectSchema.parse({ ...validProject, name: "" })).toThrow();
  });

  it("rejects negative systemCount", () => {
    expect(() => ProjectSchema.parse({ ...validProject, systemCount: -1 })).toThrow();
  });
});

describe("ProjectListSchema", () => {
  it("parses an empty array", () => {
    expect(ProjectListSchema.parse([])).toEqual([]);
  });

  it("parses a list of projects", () => {
    const list = ProjectListSchema.parse([
      validProject,
      { ...validProject, id: "550e8400-e29b-41d4-a716-446655440001" },
    ]);
    expect(list).toHaveLength(2);
  });
});

describe("CreateProjectSchema", () => {
  it("accepts name only", () => {
    const r = CreateProjectSchema.parse({ name: "New Project" });
    expect(r.name).toBe("New Project");
  });

  it("rejects empty name", () => {
    expect(() => CreateProjectSchema.parse({ name: "" })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Run / Metrics schemas
// ─────────────────────────────────────────────────────────────────────────────

const validMetrics = {
  precision: 0.92,
  recall: 0.88,
  mrr: 0.75,
  latencyMs: 320,
  tokenUsage: 1200,
  costUsd: 0.004,
  hallucinationScore: 0.03,
};

const validRun = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  systemId: "550e8400-e29b-41d4-a716-446655440001",
  systemName: "My System",
  metrics: validMetrics,
  configSnapshot: { "node-1": { chunkSize: 512 } },
  status: "completed" as const,
  createdAt: "2024-01-15T10:30:00Z",
};

describe("MetricsSchema", () => {
  it("parses valid metrics", () => {
    const m = MetricsSchema.parse(validMetrics);
    expect(m.precision).toBe(0.92);
  });

  it("rejects precision > 1", () => {
    expect(() => MetricsSchema.parse({ ...validMetrics, precision: 1.5 })).toThrow();
  });

  it("rejects negative latency", () => {
    expect(() => MetricsSchema.parse({ ...validMetrics, latencyMs: -1 })).toThrow();
  });

  it("accepts zero metrics (running run)", () => {
    const zeros = {
      precision: 0,
      recall: 0,
      mrr: 0,
      latencyMs: 0,
      tokenUsage: 0,
      costUsd: 0,
      hallucinationScore: 0,
    };
    expect(() => MetricsSchema.parse(zeros)).not.toThrow();
  });
});

describe("RunStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["completed", "running", "failed"]) {
      expect(() => RunStatusSchema.parse(s)).not.toThrow();
    }
  });

  it("rejects unknown status", () => {
    expect(() => RunStatusSchema.parse("pending")).toThrow();
  });
});

describe("EvaluationRunSchema", () => {
  it("parses a valid completed run", () => {
    const r = EvaluationRunSchema.parse(validRun);
    expect(r.status).toBe("completed");
    expect(r.metrics.precision).toBe(0.92);
  });

  it("parses a running run with zero metrics", () => {
    const runningRun = {
      ...validRun,
      status: "running",
      metrics: {
        precision: 0,
        recall: 0,
        mrr: 0,
        latencyMs: 0,
        tokenUsage: 0,
        costUsd: 0,
        hallucinationScore: 0,
      },
    };
    const r = EvaluationRunSchema.parse(runningRun);
    expect(r.status).toBe("running");
    expect(r.metrics.precision).toBe(0);
  });
});

describe("EvaluationRunListSchema", () => {
  it("parses an empty list", () => {
    expect(EvaluationRunListSchema.parse([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// System schemas
// ─────────────────────────────────────────────────────────────────────────────

const validNode = {
  id: "node-1",
  type: "chunker" as const,
  name: "Chunker",
  config: { chunkSize: 512 },
  position: { x: 100, y: 200 },
};

const validSystem = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "550e8400-e29b-41d4-a716-446655440001",
  name: "My RAG System",
  version: 1,
  nodes: [validNode],
  edges: [],
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
};

describe("SystemNodeSchema", () => {
  it("parses a valid node", () => {
    const n = SystemNodeSchema.parse(validNode);
    expect(n.id).toBe("node-1");
    expect(n.inputs).toEqual([]);
    expect(n.outputs).toEqual([]);
  });

  it("accepts optional codeComponentId", () => {
    const n = SystemNodeSchema.parse({
      ...validNode,
      codeComponentId: "550e8400-e29b-41d4-a716-446655440099",
    });
    expect(n.codeComponentId).toBe("550e8400-e29b-41d4-a716-446655440099");
  });

  it("accepts inputs and outputs", () => {
    const n = SystemNodeSchema.parse({ ...validNode, inputs: ["doc"], outputs: ["chunk"] });
    expect(n.inputs).toEqual(["doc"]);
  });

  it("rejects invalid node type", () => {
    expect(() => SystemNodeSchema.parse({ ...validNode, type: "invalid_type" })).toThrow();
  });
});

describe("SystemEdgeSchema", () => {
  it("parses a valid edge", () => {
    const e = SystemEdgeSchema.parse({ id: "e-1", source: "node-1", target: "node-2" });
    expect(e.source).toBe("node-1");
  });
});

describe("SystemDefinitionSchema", () => {
  it("parses a valid system", () => {
    const s = SystemDefinitionSchema.parse(validSystem);
    expect(s.name).toBe("My RAG System");
    expect(s.version).toBe(1);
    expect(s.nodes).toHaveLength(1);
  });

  it("rejects version < 1", () => {
    expect(() => SystemDefinitionSchema.parse({ ...validSystem, version: 0 })).toThrow();
  });

  it("rejects empty system name", () => {
    expect(() => SystemDefinitionSchema.parse({ ...validSystem, name: "" })).toThrow();
  });
});
