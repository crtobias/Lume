import { PanelBottom, GitBranch } from "lucide-react";
import { useGitStore } from "../../state/git";
import { useEditorStore } from "../../state/editor";
import { useUIStore } from "../../state/ui";
import { useThemeStore, activeTheme } from "../../state/theme";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const repos = useGitStore((s) => s.repos);
  const activePath = useEditorStore((s) => s.activePath);
  const panelOpen = useUIStore((s) => s.panelOpen);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const mode = useThemeStore((s) => s.mode);
  const lastDark = useThemeStore((s) => s.lastDark);
  const lastLight = useThemeStore((s) => s.lastLight);

  // Pick the repo that owns the active file, else the first discovered repo.
  const norm = activePath?.replace(/\\/g, "/") ?? null;
  const primary =
    (norm
      ? repos.find((r) => norm.startsWith(r.path.replace(/\\/g, "/").replace(/\/+$/, "") + "/"))
      : null) ?? repos[0] ?? null;

  const branch = primary?.status.branch ?? null;
  const changes = primary?.status.changes.length ?? 0;
  const ahead = primary?.status.ahead ?? 0;
  const behind = primary?.status.behind ?? 0;
  const themeName = activeTheme({ mode, lastDark, lastLight }).name;

  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        {primary && branch && (
          <span className={styles.item} title={primary.status.upstream ?? branch}>
            <span className={styles.dot} />
            <span>{branch}</span>
            {(ahead > 0 || behind > 0) && (
              <span className={styles.sync}>
                {behind > 0 && <span>↓{behind}</span>}
                {ahead > 0 && <span>↑{ahead}</span>}
              </span>
            )}
          </span>
        )}
        {primary && (
          <span className={`${styles.item} ${styles.faint}`}>
            {changes > 0 ? `± ${changes}` : "✓ 0"}
          </span>
        )}
        {repos.length > 1 && (
          <span className={`${styles.item} ${styles.faint}`} title={`${repos.length} repositories`}>
            <GitBranch size={11} strokeWidth={2} />
            <span>{repos.length} repos</span>
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
          <PanelBottom size={11} strokeWidth={2} />
          <span>Terminal</span>
        </button>
        <span className={styles.faint}>·</span>
        <span className={styles.item}>UTF-8</span>
        <span className={styles.faint}>·</span>
        <span className={styles.item}>Spaces: 2</span>
        <span className={styles.faint}>·</span>
        <span className={styles.item}>Ln 1, Col 1</span>
        <span className={styles.faint}>·</span>
        <span className={styles.theme}>{themeName}</span>
      </div>
    </footer>
  );
}
