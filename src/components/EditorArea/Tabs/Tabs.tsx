import { X } from "lucide-react";
import { useEditorStore } from "../../../state/editor";
import styles from "./Tabs.module.css";

export function Tabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activePath = useEditorStore((s) => s.activePath);
  const setActive = useEditorStore((s) => s.setActive);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => {
        const active = t.path === activePath;
        const dirty = t.content !== t.savedContent;
        return (
          <div
            key={t.path}
            role="tab"
            aria-selected={active}
            className={`${styles.tab} ${active ? styles.active : ""}`}
            onClick={() => setActive(t.path)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(t.path);
              }
            }}
            title={t.path}
          >
            <span className={styles.name}>{t.name}</span>
            <button
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.path);
              }}
              aria-label={`Close ${t.name}`}
              title="Close"
            >
              {dirty ? <span className={styles.dot} /> : <X size={14} strokeWidth={2} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
