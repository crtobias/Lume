import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export type FsEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

export type ShellInfo = {
  name: string;
  path: string;
  icon: string;
};

export type FileChange = {
  path: string;
  stagedStatus: string;
  unstagedStatus: string;
  kind: "tracked" | "untracked" | "conflict";
};

export type GitStatus = {
  isRepo: boolean;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  changes: FileChange[];
};

export const ipc = {
  fs: {
    readDir: (path: string) => invoke<FsEntry[]>("fs_read_dir", { path }),
    readFile: (path: string) => invoke<string>("fs_read_file", { path }),
    writeFile: (path: string, content: string) =>
      invoke<void>("fs_write_file", { path, content }),
  },
  dialog: {
    openFolder: async (): Promise<string | null> => {
      const r = await openDialog({ directory: true, multiple: false });
      return typeof r === "string" ? r : null;
    },
  },
  pty: {
    detectShells: () => invoke<ShellInfo[]>("detect_shells"),
  },
  git: {
    status: (repo: string) => invoke<GitStatus>("git_status", { repo }),
    stage: (repo: string, paths: string[]) => invoke<void>("git_stage", { repo, paths }),
    unstage: (repo: string, paths: string[]) => invoke<void>("git_unstage", { repo, paths }),
    discard: (repo: string, paths: string[]) => invoke<void>("git_discard", { repo, paths }),
    commit: (repo: string, message: string) => invoke<void>("git_commit", { repo, message }),
    push: (repo: string) => invoke<string>("git_push", { repo }),
    pull: (repo: string) => invoke<string>("git_pull", { repo }),
    fetch: (repo: string) => invoke<string>("git_fetch", { repo }),
    branches: (repo: string) => invoke<string[]>("git_branches", { repo }),
    checkout: (repo: string, branch: string) =>
      invoke<void>("git_checkout", { repo, branch }),
  },
};
