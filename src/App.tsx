import { useEffect } from "react";
import { ActivityBar } from "./components/ActivityBar/ActivityBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { EditorArea } from "./components/EditorArea/EditorArea";
import { Panel } from "./components/Panel/Panel";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { useEditorStore } from "./state/editor";
import { useWorkspaceStore } from "./state/workspace";
import { useUIStore } from "./state/ui";
import { useTerminalStore } from "./state/terminal";
import styles from "./App.module.css";

export default function App() {
  const saveActive = useEditorStore((s) => s.saveActive);
  const openFolder = useWorkspaceStore((s) => s.openFolder);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && !e.shiftKey && !e.altKey && key === "s") {
        e.preventDefault();
        void saveActive();
        return;
      }
      if (mod && !e.shiftKey && !e.altKey && key === "o") {
        e.preventDefault();
        void openFolder();
        return;
      }
      // Ctrl+` toggles the panel (matches VSCode).
      if (mod && !e.shiftKey && !e.altKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        const ui = useUIStore.getState();
        ui.togglePanel();
        return;
      }
      // Ctrl+Shift+` spawns a new terminal with the default shell.
      if (mod && e.shiftKey && !e.altKey && (e.key === "`" || e.code === "Backquote" || e.key === "~")) {
        e.preventDefault();
        const ui = useUIStore.getState();
        if (!ui.panelOpen) ui.togglePanel();
        useTerminalStore.getState().addSession();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveActive, openFolder]);

  return (
    <div className={styles.app}>
      <ActivityBar />
      <Sidebar />
      <div className={styles.main}>
        <EditorArea />
        <Panel />
      </div>
      <StatusBar />
    </div>
  );
}
