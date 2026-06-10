import { create } from "zustand";
import { ipc } from "../lib/ipc";

export type Tab = {
  path: string;
  name: string;
  content: string;
  savedContent: string;
};

interface EditorState {
  tabs: Tab[];
  activePath: string | null;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveActive: () => Promise<void>;
  isDirty: (path: string) => boolean;
}

function basename(p: string): string {
  const norm = p.replace(/[\\]+$/g, "");
  const idx = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"));
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activePath: null,

  openFile: async (path: string) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    const content = await ipc.fs.readFile(path);
    set((s) => ({
      tabs: [
        ...s.tabs,
        { path, name: basename(path), content, savedContent: content },
      ],
      activePath: path,
    }));
  },

  closeTab: (path: string) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path);
      if (idx < 0) return s;
      const newTabs = s.tabs.filter((t) => t.path !== path);
      let newActive = s.activePath;
      if (s.activePath === path) {
        newActive =
          newTabs[idx]?.path ?? newTabs[idx - 1]?.path ?? newTabs[0]?.path ?? null;
      }
      return { tabs: newTabs, activePath: newActive };
    });
  },

  setActive: (path: string) => set({ activePath: path }),

  updateContent: (path: string, content: string) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, content } : t)),
    }));
  },

  saveActive: async () => {
    const { activePath, tabs } = get();
    if (!activePath) return;
    const tab = tabs.find((t) => t.path === activePath);
    if (!tab) return;
    await ipc.fs.writeFile(tab.path, tab.content);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.path === activePath ? { ...t, savedContent: t.content } : t,
      ),
    }));
  },

  isDirty: (path: string) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab) return false;
    return tab.content !== tab.savedContent;
  },
}));
