import { useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, Plus, RefreshCw, Minus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore } from "../../../state/workspace";
import { useGitStore } from "../../../state/git";
import { useEditorStore } from "../../../state/editor";
import type { FileChange } from "../../../lib/ipc";
import styles from "./SourceControl.module.css";

function basename(p: string): string {
  const norm = p.replace(/[\\]+$/g, "");
  const idx = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"));
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

function badgeFor(change: FileChange): { label: string; color: string } {
  if (change.kind === "untracked") {
    return { label: "U", color: "var(--color-git-untracked)" };
  }
  if (change.kind === "conflict") {
    return { label: "C", color: "var(--color-git-conflict)" };
  }
  const s = change.stagedStatus !== "." ? change.stagedStatus : change.unstagedStatus;
  const color =
    s === "M"
      ? "var(--color-git-modified)"
      : s === "A"
      ? "var(--color-git-added)"
      : s === "D"
      ? "var(--color-git-deleted)"
      : s === "R"
      ? "var(--color-git-renamed)"
      : "var(--color-fg-muted)";
  return { label: s, color };
}

export function SourceControl() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const status = useGitStore((s) => s.status);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const refresh = useGitStore((s) => s.refresh);
  const stage = useGitStore((s) => s.stage);
  const unstage = useGitStore((s) => s.unstage);
  const discard = useGitStore((s) => s.discard);
  const commit = useGitStore((s) => s.commit);
  const push = useGitStore((s) => s.push);
  const pull = useGitStore((s) => s.pull);
  const lastError = useGitStore((s) => s.lastError);

  // Poll status while panel is mounted.
  useEffect(() => {
    if (!rootPath) return;
    void refresh(rootPath);
    const t = setInterval(() => void refresh(rootPath), 2000);
    return () => clearInterval(t);
  }, [rootPath, refresh]);

  const { staged, unstaged, untracked } = useMemo(() => {
    const staged: FileChange[] = [];
    const unstaged: FileChange[] = [];
    const untracked: FileChange[] = [];
    for (const c of status?.changes ?? []) {
      if (c.kind === "untracked") {
        untracked.push(c);
      } else {
        if (c.stagedStatus !== ".") staged.push(c);
        if (c.unstagedStatus !== ".") unstaged.push(c);
      }
    }
    return { staged, unstaged, untracked };
  }, [status]);

  if (!rootPath) {
    return (
      <div className={styles.placeholder}>Open a folder to use Source Control.</div>
    );
  }
  if (status && !status.isRepo) {
    return <div className={styles.placeholder}>This folder is not a Git repository.</div>;
  }

  const canCommit = staged.length > 0 && commitMessage.trim().length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.repoBar}>
        <span className={styles.repoName}>{basename(rootPath)}</span>
        <div className={styles.repoActions}>
          <button className={styles.iconBtn} title="Pull" onClick={() => pull(rootPath)}>
            <RotateCcw size={14} strokeWidth={2} />
          </button>
          <button className={styles.iconBtn} title="Push" onClick={() => push(rootPath)}>
            <ChevronRight size={14} strokeWidth={2} />
          </button>
          <button
            className={styles.iconBtn}
            title="Refresh"
            onClick={() => refresh(rootPath)}
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <textarea
        className={styles.commitInput}
        placeholder="Message (Ctrl+Enter to commit)"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canCommit) {
            e.preventDefault();
            void commit(rootPath);
          }
        }}
        rows={2}
      />
      <button
        className={`${styles.commitBtn} ${!canCommit ? styles.commitBtnDisabled : ""}`}
        disabled={!canCommit}
        onClick={() => void commit(rootPath)}
      >
        <Check size={14} strokeWidth={2} />
        <span>Commit{staged.length > 0 ? ` (${staged.length})` : ""}</span>
      </button>

      {lastError && <div className={styles.error}>{lastError}</div>}

      <Section
        title="Staged Changes"
        count={staged.length}
        files={staged}
        action="unstage"
        repo={rootPath}
        onStage={stage}
        onUnstage={unstage}
        onDiscard={discard}
      />
      <Section
        title="Changes"
        count={unstaged.length}
        files={unstaged}
        action="stage"
        repo={rootPath}
        onStage={stage}
        onUnstage={unstage}
        onDiscard={discard}
      />
      <Section
        title="Untracked"
        count={untracked.length}
        files={untracked}
        action="stage"
        repo={rootPath}
        onStage={stage}
        onUnstage={unstage}
        onDiscard={discard}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  files: FileChange[];
  action: "stage" | "unstage";
  repo: string;
  onStage: (repo: string, paths: string[]) => Promise<void>;
  onUnstage: (repo: string, paths: string[]) => Promise<void>;
  onDiscard: (repo: string, paths: string[]) => Promise<void>;
}

function Section({ title, count, files, action, repo, onStage, onUnstage, onDiscard }: SectionProps) {
  const [open, setOpen] = useState(true);
  const openFile = useEditorStore((s) => s.openFile);
  const Chevron = open ? ChevronDown : ChevronRight;
  if (count === 0) return null;

  return (
    <div className={styles.section}>
      <div
        className={styles.sectionHeader}
        onClick={() => setOpen((o) => !o)}
        role="button"
      >
        <Chevron size={14} strokeWidth={2} />
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionCount}>{count}</span>
      </div>
      {open && (
        <ul className={styles.list}>
          {files.map((c) => {
            const { label, color } = badgeFor(c);
            const fullPath = `${repo.replace(/[\\/]+$/, "")}/${c.path}`;
            return (
              <li
                key={c.path + action}
                className={styles.row}
                onDoubleClick={() => void openFile(fullPath)}
                title={c.path}
              >
                <span className={styles.rowName}>{basename(c.path)}</span>
                <span className={styles.rowPath}>{c.path}</span>
                <div className={styles.rowActions}>
                  {action === "stage" && c.kind === "tracked" && (
                    <button
                      className={styles.rowIcon}
                      title="Discard Changes"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDiscard(repo, [c.path]);
                      }}
                    >
                      <RotateCcw size={12} strokeWidth={2} />
                    </button>
                  )}
                  {action === "stage" && (
                    <button
                      className={styles.rowIcon}
                      title="Stage Changes"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onStage(repo, [c.path]);
                      }}
                    >
                      <Plus size={12} strokeWidth={2} />
                    </button>
                  )}
                  {action === "unstage" && (
                    <button
                      className={styles.rowIcon}
                      title="Unstage Changes"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onUnstage(repo, [c.path]);
                      }}
                    >
                      <Minus size={12} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <span className={styles.badge} style={{ color }}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
