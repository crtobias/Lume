import { useEffect } from "react";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { ActivityBar } from "./components/ActivityBar/ActivityBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { EditorArea } from "./components/EditorArea/EditorArea";
import { Panel } from "./components/Panel/Panel";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { Settings } from "./components/Settings/Settings";
import { useEditorStore } from "./state/editor";
import { useWorkspaceStore } from "./state/workspace";
import { useUIStore } from "./state/ui";
import { useTerminalStore } from "./state/terminal";
import { useThemeStore } from "./state/theme";
import { useGitStore } from "./state/git";
import styles from "./App.module.css";

export default function App() {
  const saveActive = useEditorStore((s) => s.saveActive);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const overlay = useUIStore((s) => s.overlay);
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);

  // Discover git repos under the open folder, then poll their status.
  useEffect(() => {
    const git = useGitStore.getState();
    if (!rootPath) return;
    void git.discover(rootPath);
    const t = setInterval(() => void useGitStore.getState().refresh(), 15000);
    return () => clearInterval(t);
  }, [rootPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === "Escape") {
        if (useUIStore.getState().overlay) {
          e.preventDefault();
          useUIStore.getState().setOverlay(null);
        }
        return;
      }
      if (!mod) return;

      // Command palette
      if (!e.shiftKey && !e.altKey && key === "k") {
        e.preventDefault();
        useUIStore.getState().toggleOverlay("palette");
        return;
      }
      // Settings
      if (!e.shiftKey && !e.altKey && e.key === ",") {
        e.preventDefault();
        useUIStore.getState().toggleOverlay("settings");
        return;
      }
      // Toggle light/dark
      if (!e.shiftKey && !e.altKey && (e.key === "\\" || e.key === "j")) {
        e.preventDefault();
        useThemeStore.getState().toggleMode();
        return;
      }
      // Toggle sidebar
      if (!e.shiftKey && !e.altKey && key === "b") {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
        return;
      }
      if (!e.shiftKey && !e.altKey && key === "s") {
        e.preventDefault();
        void saveActive();
        return;
      }
      if (!e.shiftKey && !e.altKey && key === "o") {
        e.preventDefault();
        void openFolder();
        return;
      }
      // Ctrl+` toggles the panel (matches VSCode).
      if (!e.shiftKey && !e.altKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        useUIStore.getState().togglePanel();
        return;
      }
      // Ctrl+Shift+` spawns a new terminal with the default shell.
      if (e.shiftKey && !e.altKey && (e.key === "`" || e.code === "Backquote" || e.key === "~")) {
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
    <div className={`${styles.app} ${!sidebarVisible ? styles.sidebarHidden : ""}`}>
      <TitleBar />
      <ActivityBar />
      {sidebarVisible && <Sidebar />}
      <div className={styles.main}>
        <EditorArea />
        <Panel />
      </div>
      <StatusBar />
      {overlay === "palette" && <CommandPalette />}
      {overlay === "settings" && <Settings />}
    </div>
  );
}
