import { create } from "zustand";
import { ipc, type ShellInfo } from "../lib/ipc";

export type TerminalSession = {
  id: number; // sentinel: 0 = "pending spawn", real id after backend spawn
  localKey: string; // stable key for React, even before backend spawn
  name: string;
  shellPath: string | null; // null = let backend pick default
};

interface TerminalState {
  sessions: TerminalSession[];
  activeKey: string | null;
  nextNumber: number;
  shells: ShellInfo[];
  defaultShellPath: string | null;
  loadShells: () => Promise<void>;
  addSession: (shell?: ShellInfo | null) => string;
  setBackendId: (localKey: string, id: number) => void;
  closeSession: (localKey: string) => void;
  setActive: (localKey: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeKey: null,
  nextNumber: 1,
  shells: [],
  defaultShellPath: null,

  loadShells: async () => {
    try {
      const shells = await ipc.pty.detectShells();
      set({
        shells,
        defaultShellPath: get().defaultShellPath ?? shells[0]?.path ?? null,
      });
    } catch (e) {
      console.error("detectShells failed:", e);
    }
  },

  addSession: (shell) => {
    const n = get().nextNumber;
    const localKey = `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const shellPath = shell?.path ?? get().defaultShellPath ?? null;
    const baseName = shell?.name ?? "Terminal";
    const session: TerminalSession = {
      id: 0,
      localKey,
      name: shell ? `${shell.name} ${n}` : `${baseName} ${n}`,
      shellPath,
    };
    set((s) => ({
      sessions: [...s.sessions, session],
      activeKey: localKey,
      nextNumber: n + 1,
    }));
    return localKey;
  },

  setBackendId: (localKey, id) => {
    set((s) => ({
      sessions: s.sessions.map((t) => (t.localKey === localKey ? { ...t, id } : t)),
    }));
  },

  closeSession: (localKey) => {
    set((s) => {
      const idx = s.sessions.findIndex((t) => t.localKey === localKey);
      if (idx < 0) return s;
      const next = s.sessions.filter((t) => t.localKey !== localKey);
      let active = s.activeKey;
      if (s.activeKey === localKey) {
        active = next[idx]?.localKey ?? next[idx - 1]?.localKey ?? next[0]?.localKey ?? null;
      }
      return { sessions: next, activeKey: active };
    });
  },

  setActive: (localKey) => set({ activeKey: localKey }),
}));
