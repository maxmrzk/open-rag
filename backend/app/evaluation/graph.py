"""System graph normalization and validation helpers."""

from collections import defaultdict, deque

SUPPORTED_NODE_TYPES = {
    "document_loader",
    "chunker",
    "embedder",
    "vector_store",
    "retriever",
    "reranker",
    "llm",
    "evaluation",
}


def normalize_graph(nodes: list[dict], edges: list[dict]) -> dict:
    node_by_id = {n["id"]: n for n in nodes}

    unsupported = sorted(
        {
            str(n.get("type"))
            for n in nodes
            if str(n.get("type")) not in SUPPORTED_NODE_TYPES
        }
    )
    if unsupported:
        raise ValueError(f"Unsupported node type(s): {', '.join(unsupported)}")

    adj: dict[str, list[str]] = defaultdict(list)
    indegree: dict[str, int] = {n["id"]: 0 for n in nodes}

    for edge in edges:
        src = edge["source"]
        dst = edge["target"]
        if src not in node_by_id or dst not in node_by_id:
            raise ValueError("Graph edge references unknown node")
        adj[src].append(dst)
        indegree[dst] += 1

    queue = deque([nid for nid, deg in indegree.items() if deg == 0])
    topo: list[str] = []

    while queue:
        nid = queue.popleft()
        topo.append(nid)
        for nxt in adj[nid]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    if len(topo) != len(nodes):
        raise ValueError("System graph contains a cycle")

    return {
        "node_by_id": node_by_id,
        "adjacency": dict(adj),
        "topological_order": topo,
    }
