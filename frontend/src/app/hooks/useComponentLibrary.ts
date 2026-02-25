import { useState, useCallback } from "react";
import { defaultComponents } from "../mock/component-library";
import type { CodeComponent, NodeType } from "../types";

const STORAGE_KEY = "ragbuilder:component-library";

function loadFromStorage(): CodeComponent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultComponents;
    const parsed: CodeComponent[] = JSON.parse(raw);
    // Merge: keep built-ins from defaults, merge user-created on top
    const userComponents = parsed.filter((c) => !c.isBuiltin);
    return [...defaultComponents, ...userComponents];
  } catch {
    return defaultComponents;
  }
}

function saveToStorage(components: CodeComponent[]) {
  try {
    // Only persist non-builtin components (builtins are always from code)
    const toSave = components.filter((c) => !c.isBuiltin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore quota errors
  }
}

export function useComponentLibrary() {
  const [components, setComponents] = useState<CodeComponent[]>(loadFromStorage);

  const persist = useCallback((updated: CodeComponent[]) => {
    setComponents(updated);
    saveToStorage(updated);
  }, []);

  const addComponent = useCallback(
    (data: Omit<CodeComponent, "id" | "isBuiltin" | "createdAt" | "updatedAt">): CodeComponent => {
      const newComponent: CodeComponent = {
        ...data,
        id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        isBuiltin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([...components, newComponent]);
      return newComponent;
    },
    [components, persist]
  );

  const updateComponent = useCallback(
    (id: string, updates: Partial<CodeComponent>) => {
      persist(
        components.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        )
      );
    },
    [components, persist]
  );

  const deleteComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (comp?.isBuiltin) return; // cannot delete built-ins
      persist(components.filter((c) => c.id !== id));
    },
    [components, persist]
  );

  const getByNodeType = useCallback(
    (nodeType: NodeType) => components.filter((c) => c.nodeType === nodeType),
    [components]
  );

  const getById = useCallback((id: string) => components.find((c) => c.id === id), [components]);

  const getDefault = useCallback(
    (nodeType: NodeType) => components.find((c) => c.nodeType === nodeType && c.isDefault),
    [components]
  );

  return {
    components,
    addComponent,
    updateComponent,
    deleteComponent,
    getByNodeType,
    getById,
    getDefault,
  };
}
