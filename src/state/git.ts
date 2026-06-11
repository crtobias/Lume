import { create } from "zustand";
import { ipc, type GitStatus } from "../lib/ipc";

export interface RepoEntry {
  path: string;
  name: string;
  status: GitStatus;
}

function basename(p: string): string {
  const norm = p.replace(/[\\/]+$/g, "");
  const idx = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"));
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

interface GitState {
  /** Discovered repositories under the open folder, each with its status. */
  repos: RepoEntry[];
  /** Cached repo paths so polling doesn't re-scan the filesystem. */
  repoPaths: string[];
  scannedRoot: string | null;
  loading: boolean;
  commitMessages: Record<string, string>;
  lastError: string | null;
  setCommitMessage: (repo: string, m: string) => void;
  /** Scan a freshly opened folder for repos, then load their status. */
  discover: (root: string) => Promise<void>;
  /** Re-fetch status for the already-discovered repos. */
  refresh: () => Promise<void>;
  stage: (repo: string, paths: string[]) => Promise<void>;
  unstage: (repo: string, paths: string[]) => Promise<void>;
  discard: (repo: string, paths: string[]) => Promise<void>;
  commit: (repo: string) => Promise<void>;
  push: (repo: string) => Promise<void>;
  pull: (repo: string) => Promise<void>;
  fetch: (repo: string) => Promise<void>;
}

async function loadStatuses(paths: string[]): Promise<RepoEntry[]> {
  const entries = await Promise.all(
    paths.map(async (path) => {
      try {
        const status = await ipc.git.status(path);
        return { path, name: basename(path), status } as RepoEntry;
      } catch {
        return null;
      }
    }),
  );
  return entries.filter((e): e is RepoEntry => e !== null && e.status.isRepo);
}

export const useGitStore = create<GitState>((set, get) => ({
  repos: [],
  repoPaths: [],
  scannedRoot: null,
  loading: false,
  commitMessages: {},
  lastError: null,

  setCommitMessage: (repo, m) =>
    set((s) => ({ commitMessages: { ...s.commitMessages, [repo]: m } })),

  discover: async (root) => {
    set({ loading: true });
    try {
      const paths = await ipc.git.discoverRepos(root);
      const repos = await loadStatuses(paths);
      set({ repoPaths: paths, scannedRoot: root, repos, lastError: null });
    } catch (err) {
      set({ lastError: String(err), repos: [], repoPaths: [] });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    const { repoPaths } = get();
    if (repoPaths.length === 0) return;
    try {
      const repos = await loadStatuses(repoPaths);
      set({ repos, lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
  },

  stage: async (repo, paths) => {
    await ipc.git.stage(repo, paths);
    await get().refresh();
  },

  unstage: async (repo, paths) => {
    await ipc.git.unstage(repo, paths);
    await get().refresh();
  },

  discard: async (repo, paths) => {
    await ipc.git.discard(repo, paths);
    await get().refresh();
  },

  commit: async (repo) => {
    const msg = get().commitMessages[repo] ?? "";
    await ipc.git.commit(repo, msg);
    set((s) => ({ commitMessages: { ...s.commitMessages, [repo]: "" } }));
    await get().refresh();
  },

  push: async (repo) => {
    try {
      await ipc.git.push(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh();
  },

  pull: async (repo) => {
    try {
      await ipc.git.pull(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh();
  },

  fetch: async (repo) => {
    try {
      await ipc.git.fetch(repo);
      set({ lastError: null });
    } catch (err) {
      set({ lastError: String(err) });
    }
    await get().refresh();
  },
}));
