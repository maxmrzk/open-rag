import type { Project } from "../types";

export const mockProjects: Project[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "Customer Support RAG",
    description: "RAG pipeline for internal customer support knowledge base with hybrid retrieval.",
    createdAt: "2026-02-10T09:00:00Z",
    systemCount: 3,
    runCount: 12,
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    name: "Legal Document Analysis",
    description: "Multi-modal document ingestion and retrieval for legal contracts and compliance.",
    createdAt: "2026-02-15T14:30:00Z",
    systemCount: 2,
    runCount: 8,
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-012345678902",
    name: "Medical Research Assistant",
    description: "PubMed and clinical trials retrieval pipeline with graph-enhanced context.",
    createdAt: "2026-02-20T11:15:00Z",
    systemCount: 1,
    runCount: 4,
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-123456789013",
    name: "Code Documentation Bot",
    description: "Internal codebase indexing and retrieval system for developer Q&A.",
    createdAt: "2026-02-22T16:45:00Z",
    systemCount: 2,
    runCount: 6,
  },
];
