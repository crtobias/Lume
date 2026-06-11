import { useEffect, useMemo, useRef, useState } from "react";
import { useUIStore } from "../../state/ui";
import { useThemeStore } from "../../state/theme";
import { useWorkspaceStore } from "../../state/workspace";
import { useEditorStore } from "../../state/editor";
import { useTerminalStore } from "../../state/terminal";
import styles from "./CommandPalette.module.css";

interface Cmd {
  label: string;
  hint: string;
  dot: string;
  run: () => void;
}

export function CommandPalette() {
  const setOverlay = useUIStore((s) => s.setOverlay);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const saveActive = useEditorStore((s) => s.saveActive);
  const addSession = useTerminalStore((s) => s.addSession);

  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, []);

  const close = () => setOverlay(null);

  const commands = useMemo<Cmd[]>(
    () => [
      { label: "Open Settings", hint: "⌘,", dot: "var(--accent)", run: () => setOverlay("settings") },
      { label: "Toggle Light / Dark", hint: "⌘\\", dot: "var(--str)", run: () => { toggleMode(); close(); } },
      { label: "Switch Theme…", hint: "", dot: "var(--type)", run: () => setOverlay("settings") },
      { label: "Open Folder…", hint: "⌘O", dot: "var(--fn)", run: () => { close(); void openFolder(); } },
      { label: "Save File", hint: "⌘S", dot: "var(--num)", run: () => { close(); void saveActive(); } },
      { label: "New Terminal", hint: "⌃`", dot: "var(--str)", run: () => { close(); useUIStore.getState().panelOpen || togglePanel(); addSession(); } },
      { label: "Toggle Terminal", hint: "⌃`", dot: "var(--fn)", run: () => { close(); togglePanel(); } },
      { label: "Toggle Sidebar", hint: "⌘B", dot: "var(--muted)", run: () => { close(); toggleSidebar(); } },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const needle = q.trim().toLowerCase();
  const filtered = commands.filter((c) => !needle || c.label.toLowerCase().includes(needle));

  return (
    <div className={styles.scrim} onClick={close}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.search}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className={styles.icon}>
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
            <line x1="12" y1="12" x2="16" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command…"
            autoComplete="off"
            spellCheck={false}
            className={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) filtered[0].run();
            }}
          />
          <span className={styles.kbd}>esc</span>
        </div>
        <div className={styles.list}>
          {filtered.map((c) => (
            <button key={c.label} className={styles.row} onClick={c.run}>
              <span className={styles.rowDot} style={{ background: c.dot }} />
              <span className={styles.rowLabel}>{c.label}</span>
              {c.hint && <span className={styles.rowHint}>{c.hint}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}
