import { Plus, X, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTerminalStore } from "../../state/terminal";
import { useUIStore } from "../../state/ui";
import type { ShellInfo } from "../../lib/ipc";
import { Terminal } from "./Terminal/Terminal";
import styles from "./Panel.module.css";

export function Panel() {
  const sessions = useTerminalStore((s) => s.sessions);
  const activeKey = useTerminalStore((s) => s.activeKey);
  const addSession = useTerminalStore((s) => s.addSession);
  const closeSession = useTerminalStore((s) => s.closeSession);
  const setActive = useTerminalStore((s) => s.setActive);
  const shells = useTerminalStore((s) => s.shells);
  const loadShells = useTerminalStore((s) => s.loadShells);
  const panelOpen = useUIStore((s) => s.panelOpen);
  const togglePanel = useUIStore((s) => s.togglePanel);
  const panelHeight = useUIStore((s) => s.panelHeight);
  const panelMaximized = useUIStore((s) => s.panelMaximized);
  const togglePanelMax = useUIStore((s) => s.togglePanelMax);

  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shells.length === 0) void loadShells();
  }, [shells.length, loadShells]);

  useEffect(() => {
    if (panelOpen && sessions.length === 0) {
      addSession();
    }
  }, [panelOpen, sessions.length, addSession]);

  useEffect(() => {
    if (!shellMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuAnchorRef.current?.contains(e.target as Node)) {
        setShellMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [shellMenuOpen]);

  const startDrag = (e: React.MouseEvent) => {
    if (panelMaximized) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = useUIStore.getState().panelHeight;
    const setHeight = useUIStore.getState().setPanelHeight;
    const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - 120);

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const dy = startY - ev.clientY;
      const next = Math.max(MIN_HEIGHT, Math.min(maxHeight, startHeight + dy));
      setHeight(next);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const heightStyle: React.CSSProperties = !panelOpen
    ? {}
    : panelMaximized
    ? {}
    : { height: panelHeight };

  return (
    <div
      className={`${styles.panel} ${!panelOpen ? styles.collapsed : ""} ${
        panelMaximized && panelOpen ? styles.maximized : ""
      }`}
      style={heightStyle}
      aria-hidden={!panelOpen}
    >
      <div
        className={styles.resizer}
        onMouseDown={startDrag}
        onDoubleClick={togglePanelMax}
        role="separator"
        aria-orientation="horizontal"
        title="Drag to resize · double-click to maximize"
      />
      <header className={styles.header}>
        <div className={styles.label}>TERMINAL</div>
        <div className={styles.tabs}>
          {sessions.map((t) => {
            const active = t.localKey === activeKey;
            return (
              <button
                key={t.localKey}
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                onClick={() => setActive(t.localKey)}
                title={t.name}
              >
                <span className={styles.tabName}>{t.name}</span>
                <span
                  className={styles.tabClose}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(t.localKey);
                  }}
                  role="button"
                  aria-label={`Close ${t.name}`}
                >
                  <X size={12} strokeWidth={2} />
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <div className={styles.split} ref={menuAnchorRef}>
            <button
              className={styles.iconBtn}
              onClick={() => addSession()}
              title="New Terminal (Ctrl+Shift+`)"
              aria-label="New Terminal"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
            <button
              className={styles.chevronBtn}
              onClick={() => setShellMenuOpen((o) => !o)}
              title="Select shell"
              aria-label="Select shell"
              aria-haspopup="menu"
              aria-expanded={shellMenuOpen}
            >
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            {shellMenuOpen && (
              <ShellMenu
                shells={shells}
                onPick={(shell) => {
                  setShellMenuOpen(false);
                  addSession(shell);
                }}
              />
            )}
          </div>
          <button
            className={styles.iconBtn}
            onClick={togglePanelMax}
            title={panelMaximized ? "Restore Panel Size" : "Maximize Panel"}
            aria-label="Maximize Panel"
            aria-pressed={panelMaximized}
          >
            {panelMaximized ? (
              <Minimize2 size={14} strokeWidth={2} />
            ) : (
              <Maximize2 size={14} strokeWidth={2} />
            )}
          </button>
          <button
            className={styles.iconBtn}
            onClick={togglePanel}
            title="Hide Panel (Ctrl+`)"
            aria-label="Hide Panel"
          >
            <ChevronDown size={14} strokeWidth={2} />
          </button>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.stack}>
          {sessions.map((t) => (
            <div
              key={t.localKey}
              className={`${styles.slot} ${t.localKey === activeKey ? styles.visible : ""}`}
            >
              <Terminal localKey={t.localKey} />
            </div>
          ))}
          {sessions.length === 0 && (
            <div className={styles.empty}>No terminal yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const MIN_HEIGHT = 80;

function ShellMenu({
  shells,
  onPick,
}: {
  shells: ShellInfo[];
  onPick: (shell: ShellInfo | null) => void;
}) {
  return (
    <div className={styles.menu} role="menu">
      <button
        className={styles.menuItem}
        onClick={() => onPick(null)}
        role="menuitem"
      >
        <span className={styles.menuItemName}>Default shell</span>
      </button>
      {shells.length > 0 && <div className={styles.menuSep} />}
      {shells.map((s) => (
        <button
          key={s.path}
          className={styles.menuItem}
          onClick={() => onPick(s)}
          role="menuitem"
          title={s.path}
        >
          <span className={styles.menuItemName}>{s.name}</span>
          <span className={styles.menuItemHint}>{s.icon}</span>
        </button>
      ))}
      {shells.length === 0 && (
        <div className={styles.menuItemDisabled}>Detecting shells…</div>
      )}
    </div>
  );
}
