import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";
import { useEditorStore } from "../../state/editor";
import { useWorkspaceStore } from "../../state/workspace";
import { useUIStore } from "../../state/ui";
import { useThemeStore } from "../../state/theme";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

function breadcrumb(path: string | null, rootPath: string | null): string {
  if (!path) return "";
  if (path.startsWith("diff:")) {
    const rel = path.split("::").pop() ?? "";
    return rel.split("/").slice(-2).join(" / ");
  }
  const norm = path.replace(/\\/g, "/");
  let rel = norm;
  if (rootPath) {
    const r = rootPath.replace(/\\/g, "/").replace(/\/+$/, "");
    if (norm.startsWith(r + "/")) rel = norm.slice(r.length + 1);
  }
  const parts = rel.split("/").filter(Boolean);
  return parts.slice(-2).join(" / ");
}

export function TitleBar() {
  const activePath = useEditorStore((s) => s.activePath);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const toggleOverlay = useUIStore((s) => s.toggleOverlay);
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void appWindow.isMaximized().then(setMaximized);
    void appWindow.onResized(() => {
      void appWindow.isMaximized().then(setMaximized);
    }).then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  const crumb = breadcrumb(activePath, rootPath);
  const isDark = mode === "dark";

  return (
    <header className={styles.bar} data-tauri-drag-region>
      <div className={styles.left} data-tauri-drag-region>
        <span className={styles.dot} data-tauri-drag-region />
        <span className={styles.wordmark} data-tauri-drag-region>lume</span>
        {crumb && <span className={styles.crumb} data-tauri-drag-region>{crumb}</span>}
      </div>

      <div className={styles.center} data-tauri-drag-region>
        <button
          className={styles.search}
          onClick={() => toggleOverlay("palette")}
          title="Search commands (Ctrl+K)"
        >
          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" className={styles.searchIcon}>
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
            <line x1="12" y1="12" x2="16" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className={styles.searchLabel}>Search commands…</span>
          <span className={styles.kbd}>⌘K</span>
        </button>
      </div>

      <div className={styles.right} data-tauri-drag-region>
        <div
          className={styles.modeToggle}
          onClick={toggleMode}
          title="Toggle Light / Dark (Ctrl+\\)"
        >
          <span className={`${styles.modeLabel} ${!isDark ? styles.modeActive : ""}`}>Light</span>
          <div className={styles.track}>
            <div className={styles.knob} style={{ transform: isDark ? "translateX(18px)" : "translateX(0)" }} />
          </div>
          <span className={`${styles.modeLabel} ${isDark ? styles.modeActive : ""}`}>Dark</span>
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => toggleOverlay("settings")}
          title="Settings (Ctrl+,)"
          aria-label="Settings"
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
            <line x1="3.5" y1="7" x2="16.5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="3.5" y1="13" x2="16.5" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="12" cy="7" r="2.4" fill="var(--chrome)" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="7.5" cy="13" r="2.4" fill="var(--chrome)" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>

        <div className={styles.winControls}>
          <button
            className={styles.winBtn}
            onClick={() => void appWindow.minimize()}
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus size={15} strokeWidth={1.6} />
          </button>
          <button
            className={styles.winBtn}
            onClick={() => void appWindow.toggleMaximize()}
            title={maximized ? "Restore" : "Maximize"}
            aria-label="Maximize"
          >
            {maximized ? <Copy size={12} strokeWidth={1.6} /> : <Square size={12} strokeWidth={1.6} />}
          </button>
          <button
            className={`${styles.winBtn} ${styles.winClose}`}
            onClick={() => void appWindow.close()}
            title="Close"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
