import { useCallback, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const MAX_HISTORY = 100;

export function useUndoRedo() {
  const past = useRef<HistorySnapshot[]>([]);
  const future = useRef<HistorySnapshot[]>([]);

  // Reactive booleans for disabling toolbar buttons
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  /**
   * Call BEFORE any mutating action with the current state.
   * Clears the redo stack.
   */
  const pushHistory = useCallback(
    (snapshot: HistorySnapshot) => {
      past.current.push({ nodes: snapshot.nodes, edges: snapshot.edges });
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      sync();
    },
    [sync]
  );

  /**
   * Returns the previous snapshot to restore, or null if nothing to undo.
   */
  const undo = useCallback(
    (current: HistorySnapshot): HistorySnapshot | null => {
      if (past.current.length === 0) return null;
      const prev = past.current.pop()!;
      future.current.unshift({ nodes: current.nodes, edges: current.edges });
      sync();
      return prev;
    },
    [sync]
  );

  /**
   * Returns the next snapshot to restore, or null if nothing to redo.
   */
  const redo = useCallback(
    (current: HistorySnapshot): HistorySnapshot | null => {
      if (future.current.length === 0) return null;
      const next = future.current.shift()!;
      past.current.push({ nodes: current.nodes, edges: current.edges });
      sync();
      return next;
    },
    [sync]
  );

  return { pushHistory, undo, redo, canUndo, canRedo };
}
