import { useEditorStore } from "../../state/editor";
import { useUIStore } from "../../state/ui";
import { Editor } from "./Editor/Editor";
import { Tabs } from "./Tabs/Tabs";
import styles from "./EditorArea.module.css";

export function EditorArea() {
  const activePath = useEditorStore((s) => s.activePath);
  const hidden = useUIStore((s) => s.panelOpen && s.panelMaximized);

  return (
    <div className={styles.area} style={hidden ? { display: "none" } : undefined}>
      <Tabs />
      {activePath ? (
        <Editor />
      ) : (
        <div className={styles.empty}>
          <div className={styles.brand}>lume</div>
          <div className={styles.hint}>Open a folder to get started</div>
        </div>
      )}
    </div>
  );
}
