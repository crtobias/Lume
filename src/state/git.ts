import { create } from "zustand";
import { ipc, type GitStatus } from "../lib/ipc";

interface GitState {
  status: GitStatus | null;
  loading: boolean;
  commitMessage: string;
  lastError: string | null;
  setCommitMessage: (m: string) => void;
  refresh: (repo: string) => Promise<void>;
  stage: (repo: string, paths: string[]) => Promise<void>;
  unstage: (repo: string, paths: string[]) => Promise<void>;
  discard: (repo: string, paths: string[]) => Promise<void>;
  commit: (repo: string) => Promise<void>;
  push: (repo: string) => Promise<void>;
  pull: (repo: string) => Promise<void>;
  fetch: (repo: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
  status: null,
  loading: false,
  commitMessage: "",
  lastError: null,

  setCommitMessage: (m) => set({ commitMessage: m }),

  refresh: async (repo) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const status = await ipc.git.status(repo);
      set({ status, lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    } finally {
      set({ loading: false });
    }
  },

  stage: async (repo, paths) => {
    await ipc.git.stage(repo, paths);
    await get().refresh(repo);
  },

  unstage: async (repo, paths) => {
    await ipc.git.unstage(repo, paths);
    await get().refresh(repo);
  },

  discard: async (repo, paths) => {
    await ipc.git.discard(repo, paths);
    await get().refresh(repo);
  },

  commit: async (repo) => {
    const msg = get().commitMessage;
    await ipc.git.commit(repo, msg);
    set({ commitMessage: "" });
    await get().refresh(repo);
  },

  push: async (repo) => {
    try {
      await ipc.git.push(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh(repo);
  },

  pull: async (repo) => {
    try {
      await ipc.git.pull(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh(repo);
  },

  fetch: async (repo) => {
    try {
      await ipc.git.fetch(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh(repo);
  },
}));
