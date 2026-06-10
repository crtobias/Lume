import { useUIStore } from "../../state/ui";
import { FileExplorer } from "./FileExplorer/FileExplorer";
import { SourceControl } from "./SourceControl/SourceControl";
import styles from "./Sidebar.module.css";

const titles: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
};

export function Sidebar() {
  const view = useUIStore((s) => s.sidebarView);

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <span className={styles.title}>{titles[view] ?? ""}</span>
      </header>
      <div className={styles.body}>
        {view === "explorer" && <FileExplorer />}
        {view === "search" && (
          <div className={styles.placeholder}>Search (phase 5)</div>
        )}
        {view === "scm" && <SourceControl />}
      </div>
    </aside>
  );
}
