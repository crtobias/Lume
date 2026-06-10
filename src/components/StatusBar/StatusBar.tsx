import { useEffect } from "react";
import { GitBranch, RefreshCw, PanelBottom } from "lucide-react";
import { useGitStore } from "../../state/git";
import { useWorkspaceStore } from "../../state/workspace";
import { useUIStore } from "../../state/ui";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const status = useGitStore((s) => s.status);
  const refresh = useGitStore((s) => s.refresh);
  const panelOpen = useUIStore((s) => s.panelOpen);
  const togglePanel = useUIStore((s) => s.togglePanel);

  useEffect(() => {
    if (!rootPath) return;
    void refresh(rootPath);
    const t = setInterval(() => void refresh(rootPath), 5000);
    return () => clearInterval(t);
  }, [rootPath, refresh]);

  const branch = status?.branch ?? null;
  const changes = status?.changes.length ?? 0;
  const ahead = status?.ahead ?? 0;
  const behind = status?.behind ?? 0;

  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        {branch && (
          <span className={styles.item} title={status?.upstream ?? branch}>
            <GitBranch size={13} strokeWidth={2} />
            <span>{branch}</span>
            {(ahead > 0 || behind > 0) && (
              <span className={styles.sync}>
                {behind > 0 && <span>↓{behind}</span>}
                {ahead > 0 && <span>↑{ahead}</span>}
              </span>
            )}
          </span>
        )}
        {changes > 0 && (
          <span className={styles.item}>
            <RefreshCw size={13} strokeWidth={2} />
            <span>{changes}</span>
          </span>
        )}
      </div>
      <div className={styles.right}>
        <button
          className={`${styles.item} ${styles.btnItem} ${panelOpen ? styles.itemActive : ""}`}
          onClick={togglePanel}
          title={`${panelOpen ? "Hide" : "Show"} Panel (Ctrl+\`)`}
          aria-label="Toggle Panel"
          aria-pressed={panelOpen}
        >
          <PanelBottom size={13} strokeWidth={2} />
          <span>Terminal</span>
        </button>
        <span className={styles.item}>UTF-8</span>
        <span className={styles.item}>LF</span>
        <span className={styles.item}>Ln 1, Col 1</span>
      </div>
    </footer>
  );
}
