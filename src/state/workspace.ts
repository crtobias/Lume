import { create } from "zustand";
import { ipc, type FsEntry } from "../lib/ipc";

export type TreeNode = FsEntry & {
  id: string;
  children?: TreeNode[];
  loaded?: boolean;
};

interface WorkspaceState {
  rootPath: string | null;
  rootName: string | null;
  tree: TreeNode[];
  openFolder: () => Promise<void>;
  expand: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function basename(p: string): string {
  const norm = p.replace(/[\\]+$/g, "");
  const idx = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"));
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

function toNodes(entries: FsEntry[]): TreeNode[] {
  return entries
    .map((e) => ({
      ...e,
      id: e.path,
      children: e.isDir ? [] : undefined,
      loaded: false,
    }))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function findAndUpdate(
  nodes: TreeNode[],
  path: string,
  update: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.path === path) return update(n);
    if (n.children && path.startsWith(n.path)) {
      return { ...n, children: findAndUpdate(n.children, path, update) };
    }
    return n;
  });
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  rootName: null,
  tree: [],

  openFolder: async () => {
    const path = await ipc.dialog.openFolder();
    if (!path) return;
    const entries = await ipc.fs.readDir(path);
    set({
      rootPath: path,
      rootName: basename(path),
      tree: toNodes(entries),
    });
  },

  expand: async (path: string) => {
    const entries = await ipc.fs.readDir(path);
    set((s) => ({
      tree: findAndUpdate(s.tree, path, (n) => ({
        ...n,
        children: toNodes(entries),
        loaded: true,
      })),
    }));
  },

  refresh: async () => {
    const root = get().rootPath;
    if (!root) return;
    const entries = await ipc.fs.readDir(root);
    set({ tree: toNodes(entries) });
  },
}));
