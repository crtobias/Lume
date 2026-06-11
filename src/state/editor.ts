import { create } from "zustand";
import { ipc } from "../lib/ipc";
import { useGitStore } from "./git";

export type Tab = {
  path: string;
  name: string;
  kind: "file" | "diff";
  content: string;
  savedContent: string;
  /** diff-only: the repository and path-relative-to-repo being compared. */
  repo?: string;
  relPath?: string;
};

interface EditorState {
  tabs: Tab[];
  activePath: string | null;
  openFile: (path: string) => Promise<void>;
  openDiff: (repo: string, relPath: string) => void;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  save: (path: string) => Promise<void>;
  saveActive: () => Promise<void>;
  isDirty: (path: string) => boolean;
}

/** Autosave: save ~1s after the user stops typing, debounced per file. */
const AUTOSAVE_DELAY = 1000;
const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
        { path, name: basename(path), kind: "file", content, savedContent: content },
      ],
      activePath: path,
    }));
  },

  openDiff: (repo: string, relPath: string) => {
    const key = `diff:${repo}::${relPath}`;
    const existing = get().tabs.find((t) => t.path === key);
    if (existing) {
      set({ activePath: key });
      return;
    }
    set((s) => ({
      tabs: [
        ...s.tabs,
        {
          path: key,
          name: basename(relPath),
          kind: "diff",
          content: "",
          savedContent: "",
          repo,
          relPath,
        },
      ],
      activePath: key,
    }));
  },

  closeTab: (path: string) => {
    const pending = autosaveTimers.get(path);
    if (pending) {
      clearTimeout(pending);
      autosaveTimers.delete(path);
    }
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
    // Debounced autosave: reset the timer on every keystroke.
    const existing = autosaveTimers.get(path);
    if (existing) clearTimeout(existing);
    autosaveTimers.set(
      path,
      setTimeout(() => {
        autosaveTimers.delete(path);
        void get().save(path);
      }, AUTOSAVE_DELAY),
    );
  },

  save: async (path: string) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab || tab.kind !== "file") return;
    if (tab.content === tab.savedContent) return;
    await ipc.fs.writeFile(tab.path, tab.content);
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.path === path ? { ...t, savedContent: t.content } : t,
      ),
    }));
    // Reflect the saved change in Source Control right away.
    void useGitStore.getState().refresh();
  },

  saveActive: async () => {
    const { activePath } = get();
    if (!activePath) return;
    const pending = autosaveTimers.get(activePath);
    if (pending) {
      clearTimeout(pending);
      autosaveTimers.delete(activePath);
    }
    await get().save(activePath);
  },

  isDirty: (path: string) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab) return false;
    return tab.content !== tab.savedContent;
  },
}));
