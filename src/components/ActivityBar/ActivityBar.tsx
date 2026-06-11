import { Files, GitBranch, Search, Settings } from "lucide-react";
import styles from "./ActivityBar.module.css";
import { useUIStore } from "../../state/ui";

const ICON_SIZE = 20;

const items = [
  { id: "explorer" as const, icon: Files, label: "Explorer" },
  { id: "search" as const, icon: Search, label: "Search" },
  { id: "scm" as const, icon: GitBranch, label: "Source Control" },
];

export function ActivityBar() {
  const view = useUIStore((s) => s.sidebarView);
  const setView = useUIStore((s) => s.setSidebarView);
  const toggleOverlay = useUIStore((s) => s.toggleOverlay);

  return (
    <div className={styles.bar}>
      <div className={styles.top}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button
              key={it.id}
              className={`${styles.item} ${active ? styles.active : ""}`}
              title={it.label}
              onClick={() => setView(it.id)}
              aria-label={it.label}
            >
              <Icon size={ICON_SIZE} strokeWidth={1.4} />
            </button>
          );
        })}
      </div>
      <div className={styles.bottom}>
        <button
          className={styles.item}
          title="Settings (Ctrl+,)"
          aria-label="Settings"
          onClick={() => toggleOverlay("settings")}
        >
          <Settings size={ICON_SIZE} strokeWidth={1.4} />
        </button>
      </div>
    </div>
  );
}
