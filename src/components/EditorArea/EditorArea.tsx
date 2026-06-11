import { useEditorStore } from "../../state/editor";
import { useUIStore } from "../../state/ui";
import { Editor } from "./Editor/Editor";
import { DiffView } from "./DiffView/DiffView";
import { Tabs } from "./Tabs/Tabs";
import styles from "./EditorArea.module.css";

export function EditorArea() {
  const activePath = useEditorStore((s) => s.activePath);
  const activeTab = useEditorStore((s) =>
    s.activePath ? s.tabs.find((t) => t.path === s.activePath) ?? null : null,
  );
  const hidden = useUIStore((s) => s.panelOpen && s.panelMaximized);

  return (
    <div className={styles.area} style={hidden ? { display: "none" } : undefined}>
      <Tabs />
      {activeTab ? (
        activeTab.kind === "diff" ? (
          <DiffView tab={activeTab} />
        ) : (
          <Editor />
        )
      ) : activePath ? null : (
        <div className={styles.empty}>
          <div className={styles.brand}>lume</div>
          <div className={styles.hint}>Open a folder to get started</div>
        </div>
      )}
    </div>
  );
}
